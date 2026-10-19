import { computed, Injectable, signal } from '@angular/core';

export interface Todo {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

@Injectable()
export class TodoStore {
  private nextId = 4;

  private readonly _todos = signal<Todo[]>([
    { id: 1, title: 'Read the Hashbrown docs', done: true },
    { id: 2, title: 'Wire up the /api/run endpoint', done: false },
    { id: 3, title: 'Ship the demo', done: false },
  ]);

  readonly todos = this._todos.asReadonly();
  readonly openCount = computed(() => this._todos().filter((t) => !t.done).length);

  add(title: string): Todo {
    const todo: Todo = { id: this.nextId++, title, done: false };
    this._todos.update((todos) => [...todos, todo]);
    return todo;
  }

  complete(id: number): Todo | undefined {
    let updated: Todo | undefined;
    this._todos.update((todos) =>
      todos.map((todo) => {
        if (todo.id !== id) {
          return todo;
        }
        updated = { ...todo, done: true };
        return updated;
      }),
    );
    return updated;
  }

  remove(id: number): boolean {
    const before = this._todos().length;
    this._todos.update((todos) => todos.filter((todo) => todo.id !== id));
    return this._todos().length < before;
  }
}
