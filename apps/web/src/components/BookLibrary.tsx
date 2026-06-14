import { useMemo, useState } from 'react';
import { BookOpen, FileUp, Plus, Trash2 } from 'lucide-react';
import {
  listBooks,
  loadLibrarySort,
  saveLibrarySort,
  sortBooks,
  type BookLibrarySort,
  type BookMeta,
} from '../lib/library';

interface Props {
  refreshKey: number;
  onOpenBook: (id: string) => void;
  onCreateBook: () => void;
  onImportFile: () => void;
  onOpenSample: () => void;
  onDeleteBook: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function BookLibrary({
  refreshKey,
  onOpenBook,
  onCreateBook,
  onImportFile,
  onOpenSample,
  onDeleteBook,
}: Props) {
  const [sort, setSort] = useState<BookLibrarySort>(() => loadLibrarySort());
  const books = useMemo(
    () => sortBooks(listBooks(), sort),
    [refreshKey, sort],
  );

  const handleSortChange = (next: BookLibrarySort) => {
    setSort(next);
    saveLibrarySort(next);
  };

  return (
    <div className="flex-1 overflow-auto bg-[var(--surface-muted)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--ink)]">Your books</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Choose a book to edit, or start a new one.
              {books.length > 0 && (
                <span className="block sm:inline sm:ml-2">
                  {books.length} book{books.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {books.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-[var(--muted)] mr-1">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={e => handleSortChange(e.target.value as BookLibrarySort)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent-muted)] min-w-[7rem]"
                  aria-label="Sort books"
                >
                  <option value="recent">Recent</option>
                  <option value="a-z">A–Z</option>
                  <option value="z-a">Z–A</option>
                </select>
              </label>
            )}
            <button type="button" onClick={onCreateBook} className="panel-header-action inline-flex items-center gap-2">
              <Plus size={16} />
              New book
            </button>
            <button
              type="button"
              onClick={onImportFile}
              className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--highlight)] inline-flex items-center gap-2"
            >
              <FileUp size={16} />
              Import file…
            </button>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <BookOpen size={40} className="mx-auto text-[var(--muted)] mb-4" aria-hidden />
            <p className="text-[var(--ink)] font-medium">No books yet</p>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">
              Create a new book or import a .dropline3 file to get started.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onCreateBook} className="panel-header-action">
                New book
              </button>
              <button type="button" onClick={onOpenSample} className="text-sm text-[var(--accent)] hover:underline">
                Open sample book
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} onOpen={() => onOpenBook(book.id)} onDelete={() => onDeleteBook(book.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookCard({
  book,
  onOpen,
  onDelete,
}: {
  book: BookMeta;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] hover:border-[var(--accent-muted)] hover:shadow-[var(--shadow-md)] transition-shadow flex flex-col min-h-[140px]">
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 text-left p-4 min-w-0"
      >
        <p className="font-semibold text-[var(--ink)] truncate">{book.title}</p>
        <p className="text-sm text-[var(--muted)] mt-1 truncate">
          {book.authorName || 'Author not set'}
        </p>
        <p className="text-xs text-[var(--muted)] mt-3">Updated {formatDate(book.updatedAt)}</p>
      </button>
      <div className="px-4 pb-3 flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-muted)]"
          title="Delete book"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
