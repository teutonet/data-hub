-- renovate: datasource=github-tags depName=pgMemento/pgMemento extractVersion=^v(?<version>.*)$
CREATE EXTENSION IF NOT EXISTS pgmemento WITH VERSION '0.7.4';
