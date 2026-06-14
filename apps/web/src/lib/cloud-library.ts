import type { Project } from './types';
import { migrateProject, serialiseProject } from './project';
import { apiUrl, getStoredAuthToken } from './auth';
import type { BookMeta } from './library';

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
}

export async function fetchCloudLibrary(): Promise<BookMeta[] | null> {
  if (!getStoredAuthToken()) return null;
  try {
    const res = await authFetch('/books');
    if (!res.ok) return null;
    return (await res.json()) as BookMeta[];
  } catch {
    return null;
  }
}

export async function fetchCloudBook(id: string): Promise<Project | null> {
  try {
    const res = await authFetch(`/books/${id}`);
    if (!res.ok) return null;
    const data = await res.json() as { project: unknown };
    return migrateProject(data.project);
  } catch {
    return null;
  }
}

export async function saveCloudBook(id: string, project: Project, clientUpdatedAt?: string): Promise<boolean> {
  try {
    const res = await authFetch(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        project: JSON.parse(serialiseProject(project)),
        title: project.title,
        authorName: project.authorName,
        clientUpdatedAt,
      }),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

export async function createCloudBook(project: Project): Promise<string | null> {
  try {
    const res = await authFetch('/books', {
      method: 'POST',
      body: JSON.stringify({
        project: JSON.parse(serialiseProject(project)),
        title: project.title,
        authorName: project.authorName,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export async function deleteCloudBook(id: string): Promise<void> {
  try {
    await authFetch(`/books/${id}`, { method: 'DELETE' });
  } catch {
    /* offline */
  }
}
