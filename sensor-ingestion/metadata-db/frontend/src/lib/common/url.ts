export const url = (...path: string[]) => '/' + path.join('/');
export const projectUrl = (projectId: string, ...path: string[]) => url('p', projectId, ...path);
export const userUrl = (...path: string[]) => ['/u', ...path].join('/');
