
import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { PlusIcon, CubeIcon, SparklesIcon } from './icons';
import { generateProjectVisualBrief } from '../services/geminiService';
import { Project } from '../types';

interface ProjectListProps {
  onSelectProject: (id: string) => void;
}

export function ProjectList({ onSelectProject }: ProjectListProps): React.ReactElement {
  const { projects, addProject, updateProject } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [generatingBriefId, setGeneratingBriefId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc'>('date-desc');

  const filteredAndSortedProjects = useMemo(() => {
    return projects
      .filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'date-asc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'date-desc':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [projects, searchTerm, sortBy]);


  function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (newProjectName.trim()) {
      addProject(newProjectName, newProjectDesc);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowForm(false);
    }
  }

  async function handleGenerateBrief(project: Project) {
    setGeneratingBriefId(project.id);
    try {
        const brief = await generateProjectVisualBrief(project);
        updateProject(project.id, { visualBrief: brief });
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : 'An unexpected error occurred while generating the brief.');
    } finally {
        setGeneratingBriefId(null);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">My Projects</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      {!showForm && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:flex-grow bg-secondary text-light px-4 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
            />
            <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-secondary text-light px-4 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
            >
                <option value="date-desc">Sort by Newest</option>
                <option value="date-asc">Sort by Oldest</option>
                <option value="name-asc">Sort by Name (A-Z)</option>
            </select>
        </div>
      )}


      {showForm && (
        <Card className="p-6 mb-8 bg-gray-800">
          <form onSubmit={handleAddProject}>
            <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full bg-primary text-light px-4 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
                required
              />
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Project Description (optional)"
                rows={3}
                className="w-full bg-primary text-light px-4 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      )}

      {filteredAndSortedProjects.length === 0 && !showForm ? (
        <div className="text-center py-16">
            <CubeIcon className="w-16 h-16 mx-auto text-muted mb-4"/>
            <h3 className="text-xl font-semibold text-light">{searchTerm ? 'No Matching Projects' : 'No Projects Yet'}</h3>
            <p className="text-muted mt-2">{searchTerm ? 'Try a different search term.' : 'Get started by creating your first project.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map(project => {
            const isGeneratingThisBrief = generatingBriefId === project.id;
            return (
                <Card key={project.id} onClick={() => onSelectProject(project.id)} className="flex flex-col group">
                    <div className="relative aspect-[16/9] bg-primary overflow-hidden">
                        {project.visualBrief ? (
                           <>
                                <img src={project.visualBrief.imageUrl} alt="Visual brief background" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/60 p-4 flex items-center justify-center backdrop-blur-sm">
                                    <p className="text-center text-sm text-light italic leading-relaxed">"{project.visualBrief.text}"</p>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted bg-secondary p-4 text-center">
                                <SparklesIcon className="w-12 h-12 mb-2 text-gray-500" />
                                <p className="text-sm font-medium">Visual Brief</p>
                                <p className="text-xs text-gray-400 mb-4">Let AI generate a conceptual description for a project rendering.</p>
                                <Button
                                    variant="primary"
                                    onClick={(e) => { e.stopPropagation(); handleGenerateBrief(project); }}
                                    isLoading={isGeneratingThisBrief}
                                    disabled={generatingBriefId !== null}
                                    className="text-xs px-3 py-1.5"
                                >
                                    {!isGeneratingThisBrief && <SparklesIcon className="w-4 h-4 mr-1" />}
                                    {isGeneratingThisBrief ? 'Generating Brief...' : 'Generate Brief'}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="p-6 flex-grow">
                        <h3 className="text-xl font-bold text-highlight">{project.name}</h3>
                        <p className="text-muted mt-2 flex-grow">{project.description || 'No description'}</p>
                    </div>
                    <div className="p-4 bg-gray-800 border-t border-gray-700 text-xs text-muted">
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};