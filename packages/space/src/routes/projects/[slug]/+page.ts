import { error } from '@sveltejs/kit';
import { projects } from '$lib/workshop/catalog';
export const load = ({ params }: { params: { slug: string } }) => {
  const project = projects.find((entry) => entry.slug === params.slug);
  if (!project) error(404, 'Project not found');
  return { project, related: projects.filter((entry) => project.related.includes(entry.slug)) };
};
