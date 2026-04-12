import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/types/database";

export function EditBookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [setAsCurrent, setSetAsCurrent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoadError("Libro non trovato");
      return;
    }

    void (async () => {
      const { data, error: qErr } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (qErr || !data) {
        setLoadError(qErr?.message ?? "Libro non trovato");
        return;
      }
      setBook(data);
      setTitle(data.title);
      setAuthor(data.author);
      setTotalPages(String(data.total_pages));
      setSetAsCurrent(data.is_current_book);
    })();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!book || !id) return;
    setError(null);
    const pages = Number(totalPages);
    if (!title.trim() || !author.trim() || Number.isNaN(pages) || pages < 1) {
      setError("Compila titolo, autore e un numero di pagine valido (≥ 1).");
      return;
    }

    setBusy(true);

    try {
      if (setAsCurrent && !book.is_current_book) {
        const { error: clearErr } = await supabase
          .from("books")
          .update({ is_current_book: false })
          .eq("is_current_book", true);
        if (clearErr) throw clearErr;
      }

      const { error: updErr } = await supabase
        .from("books")
        .update({
          title: title.trim(),
          author: author.trim(),
          total_pages: pages,
          is_current_book: setAsCurrent,
        })
        .eq("id", id);
      if (updErr) throw updErr;

      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${id}/cover.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("covers")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
        const { error: coverErr } = await supabase
          .from("books")
          .update({ cover_url: pub.publicUrl })
          .eq("id", id);
        if (coverErr) throw coverErr;
      }

      void navigate(`/libri/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-ink-muted">{loadError}</p>
        <Link to="/" className="font-semibold text-sage-dark underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  if (!book) {
    return <p className="text-ink-muted">Caricamento…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          to={`/libri/${book.id}`}
          className="text-sm font-medium text-sage-dark underline"
        >
          ← Scheda libro
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
          Modifica libro
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Solo l&apos;admin può aggiornare titolo, autore, pagine, copertina e
          stato di &quot;libro corrente&quot;.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ink">
            Titolo
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-ink">
            Autore
          </label>
          <input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="pages"
            className="block text-sm font-medium text-ink"
          >
            Pagine totali
          </label>
          <input
            id="pages"
            type="number"
            min={1}
            step={1}
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="cover" className="block text-sm font-medium text-ink">
            Nuova copertina (opzionale)
          </label>
          <input
            id="cover"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sage-dark"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="size-4 accent-sage"
            checked={setAsCurrent}
            onChange={(e) => setSetAsCurrent(e.target.checked)}
          />
          Libro corrente del club
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-cocoa px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Salvataggio…" : "Salva modifiche"}
        </button>
      </form>
    </div>
  );
}
