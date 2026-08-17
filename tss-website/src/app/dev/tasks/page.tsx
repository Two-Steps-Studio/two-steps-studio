"use client";

import { useDevProject } from "@/contexts/dev-project-context";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus, TaskPriority } from "@/lib/types/dev-types";
import { KanbanBoard } from "@/components/DEV/kanban-board";
import type { DevTask } from "@/lib/types/dev-types";

export default function DevTasks() {
  const { tasks, activeProject, createTask, updateTask, deleteTask, moveTask, isLoading, error } = useDevProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !activeProject) return;
    setIsCreating(true);
    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        status: newTaskStatus,
        priority: newTaskPriority,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("todo");
      setNewTaskPriority("medium");
      setIsCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTask = async () => {
    if (!editingTask || !newTaskTitle.trim()) return;
    setIsCreating(true);
    try {
      await updateTask(editingTask.id, {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        status: newTaskStatus,
        priority: newTaskPriority,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("todo");
      setNewTaskPriority("medium");
      setEditingTask(null);
      setIsEditOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (task: typeof tasks[0]) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || "");
    setNewTaskStatus(task.status);
    setNewTaskPriority(task.priority);
    setIsEditOpen(true);
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(id);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleTaskMove = async (taskId: number, newStatus: TaskStatus, newOrder: number) => {
    await moveTask(taskId, newStatus, newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-dev)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a project to view tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            <span className="text-[var(--color-dev)]">Tasks</span>
          </h1>
          <p className="text-muted-foreground">Manage tasks for <span className="text-[var(--color-dev)]">{activeProject.name}</span></p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
            <DialogContent className="rounded-3xl border-[var(--border)] text-[var(--text)] bg-[var(--card-bg)]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                  className="rounded-2xl min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newTaskStatus} onValueChange={(val: TaskStatus) => setNewTaskStatus(val)}>
                    <SelectTrigger className="rounded-2xl text-[var(--text)] bg-[var(--card-bg)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-[var(--text)] bg-[var(--card-bg)]">
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTaskPriority} onValueChange={(val: TaskPriority) => setNewTaskPriority(val)}>
                    <SelectTrigger className="rounded-2xl text-[var(--text)] bg-[var(--card-bg)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className=" text-[var(--text)] bg-[var(--card-bg)]">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateTask} disabled={isCreating} className="w-full rounded-2xl">
                {isCreating ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onEditTask={openEditDialog}
        onDeleteTask={handleDeleteTask}
        onStatusChange={handleStatusChange}
        onTaskMove={handleTaskMove}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="rounded-3xl bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Task Title</Label>
              <Input
                id="edit-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
                className="rounded-2xl bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task description"
                className="rounded-2xl min-h-[100px] bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={newTaskStatus} onValueChange={(val: TaskStatus) => setNewTaskStatus(val)}>
                  <SelectTrigger className="rounded-2xl bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]">
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={(val: TaskPriority) => setNewTaskPriority(val)}>
                  <SelectTrigger className="rounded-2xl bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleEditTask} disabled={isCreating} className="w-full rounded-2xl">
              {isCreating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}