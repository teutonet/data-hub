import json
import time
import logging
from os import environ
import threading

from grafana_client import GrafanaApi
import niquests

# This syncs all private dashboards with the "public" tag to the public grafana instance
# every group is in their own directory, the prometheus datasources are rewritten to not allow access to other projects

logging.basicConfig(level=environ.get("LOGLEVEL", "INFO").upper())

def getenv_or_die(name) -> str:
  if var := environ.get(name):
    return var
  logging.error(f'missing env {name}')
  exit(1)

PUBLIC_GRAFANA_HOST = getenv_or_die('PUBLIC_GRAFANA_HOST')
PUBLIC_GRAFANA_USER = getenv_or_die('PUBLIC_GRAFANA_USER')
PUBLIC_GRAFANA_PASSWORD = getenv_or_die('PUBLIC_GRAFANA_PASSWORD')

PRIVATE_GRAFANA_HOST = getenv_or_die('PRIVATE_GRAFANA_HOST')
PRIVATE_GRAFANA_USER = getenv_or_die('PRIVATE_GRAFANA_USER')
PRIVATE_GRAFANA_PASSWORD = getenv_or_die('PRIVATE_GRAFANA_PASSWORD')

SYNC_INTERVAL = int(environ.get('SYNC_INTERVAL', '60'))

termination_lock = threading.Lock()
def on_terminate(signal_number, frame):
    logging.info("termination signal %d received", signal_number)
    # wait until current operation is complete
    with termination_lock:
        exit(128 + signal_number)

def main():
  tenant_public_grafana_api = GrafanaApi(host=PUBLIC_GRAFANA_HOST, auth=(PUBLIC_GRAFANA_USER, PUBLIC_GRAFANA_PASSWORD), organization_id=1)

  def client_for_org(org_id):
    return GrafanaApi(host=PRIVATE_GRAFANA_HOST, auth=(PRIVATE_GRAFANA_USER, PRIVATE_GRAFANA_PASSWORD), organization_id=org_id)

  main_grafana = client_for_org(None)

  # folder structure:
  # orgname
  #  dashboards (folder + name)

  # replaces the prometheus datasource with the org specific one for the public instance
  def patch_dashboard(jsn, org_prometheus_name):
    if isinstance(jsn, dict):
      for key, value in jsn.items():
        if key == 'datasource':
          if isinstance(value, dict) and 'uid' in value and value['uid'].startswith('prometheus'):
            value['uid'] = org_prometheus_name
            return
        patch_dashboard(value, org_prometheus_name)
    elif isinstance(jsn, list):
      for value in jsn:
        patch_dashboard(value, org_prometheus_name)

  existing_datasources = tenant_public_grafana_api.datasource.list_datasources()
  existing_datasources = [x for x in existing_datasources if x["type"] == 'prometheus']

  # maps the public datasource uid to id
  datasource_uid_to_id = {datasource['uid']: datasource['id'] for datasource in existing_datasources}
  datasource_uid_to_version = {}

  # maps org + the private dashboard uid to its version
  dashboard_uid_to_version: dict[tuple[str, str], str] = {}
  # public folder name to id and uid
  # deleting folders uses uid, adding a dashboard to a folder uses the id because of reasons I guess
  public_folder_cache: dict[str, str] = {folder['title']: folder['uid'] for folder in tenant_public_grafana_api.folder.get_all_folders()}

  def ensure_and_get_folder(path) -> str:
    if cached := public_folder_cache.get(path):
      return cached
    new_folder = tenant_public_grafana_api.folder.create_folder(path)
    logging.info(f'created folder {path}')
    public_folder_cache[path] = new_folder['uid']
    return new_folder['uid']

  while True:
    with termination_lock:
      unused_folders = set(public_folder_cache.keys())
      unused_datasources = set(datasource_uid_to_id.keys())
      unused_dashboards = {dashboard['uid'] for dashboard in tenant_public_grafana_api.search.search_dashboards(query='%', type_='dash-db')}

      for private_org in main_grafana.organizations.list_organization():
        logging.debug(f'reconciling {private_org}')
        private_org_name = private_org['name']
        if ':' not in private_org_name:
          continue
        org_prometheus_name = f"prometheus-{private_org_name}"
        private_org_grafana = client_for_org(private_org['id'])
        dashboards = private_org_grafana.search.search_dashboards(tag='public')
        logging.debug(f'found {len(dashboards)} to reconcile')
        if len(dashboards) == 0:
          continue
      
        # mark org resources as used
        unused_folders.discard(private_org_name)
        unused_datasources.discard(org_prometheus_name)

        # handle the prometheus datasource
        prometheus_datasource = private_org_grafana.datasource.get_datasource_by_uid('prometheus')
        prometheus_datasource_version = prometheus_datasource['version']
        del prometheus_datasource['id']
        del prometheus_datasource['version']
        prometheus_datasource['uid'] = org_prometheus_name
        prometheus_datasource['name'] = org_prometheus_name

        # fix jsonData stuff
        json_secrets = {k: v for k, v in prometheus_datasource.get('jsonData', {}).items() if k.startswith('httpHeaderValue')}
        prometheus_datasource['secureJsonData'] = {}
        prometheus_datasource['secureJsonFields'] = {}
        for key, value in json_secrets.items():
          prometheus_datasource['secureJsonData'][key] = value
          prometheus_datasource['secureJsonFields'][key] = True

        if datasource_id := datasource_uid_to_id.get(prometheus_datasource['uid']):
          existing_version = datasource_uid_to_version.get(prometheus_datasource['uid'])
          if existing_version != prometheus_datasource_version:
            logging.info(f'updating datasource {org_prometheus_name}')
            changed_datasource = tenant_public_grafana_api.datasource.update_datasource(datasource_id, prometheus_datasource)
            datasource_uid_to_version[prometheus_datasource['uid']] = changed_datasource['datasource']['version']
            logging.info(f'datasource {org_prometheus_name} updated')
          else:
            logging.debug(f'datasource {org_prometheus_name} left untouched')
        else:
          logging.info(f'creating datasource {org_prometheus_name}')
          changed_datasource = tenant_public_grafana_api.datasource.create_datasource(prometheus_datasource)
          datasource_uid_to_version[prometheus_datasource['uid']] = changed_datasource['datasource']['version']
          datasource_uid_to_id[changed_datasource['datasource']['uid']] = changed_datasource['datasource']['id']
          logging.info(f'datasource {org_prometheus_name} created')
        
        for dashboard_entry in dashboards:
          logging.debug(f'reconciling dashboard {dashboard_entry["title"]}')
          # we need to load each dashboard, because it might have changed since the last iteration
          full_dashboard = private_org_grafana.dashboard.get_dashboard(dashboard_entry['uid'])

          # make sure there can't be a malicious uid clash
          # TODO: this leaks information about the private org, I don't think it's a big deal though
          full_dashboard['dashboard']['uid'] += f'-{private_org["id"]}'
          full_dashboard_version = full_dashboard['dashboard']['version']
          
          is_in_folder = full_dashboard['meta']['folderId'] != 0
          # make absolutetly sure that there can't be naming conflicts
          full_dashboard_title = full_dashboard['dashboard']['title'].replace(' / ', ' // ')
          if is_in_folder:
            full_dashboard_title = f"{full_dashboard['meta']['folderTitle']} / {full_dashboard_title}"
          unused_dashboards.discard(full_dashboard['dashboard']['uid'])
          full_dashboard['dashboard']['title'] = full_dashboard_title

          # if this version of the dashboard was already synced to the public instance, skip over it
          if full_dashboard_version == dashboard_uid_to_version.get((private_org_name, dashboard_entry['uid'])):
            logging.debug(f"skipping dashboard {full_dashboard_title} because it's already up to date")
            continue
          logging.debug(f'before patching dashboard: {json.dumps(full_dashboard)}')
          patch_dashboard(full_dashboard, org_prometheus_name)
          logging.debug(f'after patching dashboard: {json.dumps(full_dashboard)}')
          del full_dashboard['dashboard']['id']
          full_dashboard['folderUid'] = ensure_and_get_folder(private_org_name)
          full_dashboard['overwrite'] = True
          logging.info(f'updating dashboard {full_dashboard_title}')
          tenant_public_grafana_api.dashboard.update_dashboard(full_dashboard)
          logging.info(f'updated dashboard {full_dashboard_title}')
          # store the private version, so that we know when updates can be skipped
          dashboard_uid_to_version[(private_org_name, dashboard_entry['uid'])] = full_dashboard_version
      
      for dashboard_uid in unused_dashboards:
        logging.info(f'deleting dashboard {dashboard_uid}')
        tenant_public_grafana_api.dashboard.delete_dashboard(dashboard_uid=dashboard_uid)
        logging.info(f'deleted dashboard {dashboard_uid}')

      for datasource_uid in unused_datasources:
        logging.info(f'deleting datasource {datasource_uid}')
        tenant_public_grafana_api.datasource.delete_datasource_by_uid(datasource_uid)
        del datasource_uid_to_id[datasource_uid]
        logging.info(f'deleted datasource {datasource_uid}')

      for folder in unused_folders:
        logging.info(f'deleting folder {folder}')
        try:
          tenant_public_grafana_api.folder.delete_folder(uid=public_folder_cache[folder])
        except niquests.exceptions.JSONDecodeError:
          # for some dumb reason grafana sometimes sends an empty response, which the client doesn't like
          pass
        del public_folder_cache[folder]
        logging.info(f'deleted folder {folder}')

    time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
  import signal
  signal.signal(signal.SIGTERM, on_terminate)
  main_thread = threading.Thread(target=main)
  main_thread.start()
  main_thread.join()
  # the main thread is supposed to run indefinitly,
  # return an error exit code if it unexpectedly completes
  exit(1)
