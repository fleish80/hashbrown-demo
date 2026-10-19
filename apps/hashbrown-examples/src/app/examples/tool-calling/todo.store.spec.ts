import { TodoStore } from './todo.store';

describe('TodoStore', () => {
  it('should add, complete and remove todos', () => {
    const store = new TodoStore();
    const added = store.add('Write tests');
    expect(store.todos().some((t) => t.id === added.id)).toBe(true);
    expect(store.complete(added.id)?.done).toBe(true);
    expect(store.remove(added.id)).toBe(true);
    expect(store.remove(added.id)).toBe(false);
  });
});
