import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AddBookPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setAsCurrent, setSetAsCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pages = Number(totalPages);
    if (!title.trim() || !author.trim() || Number.isNaN(pages) || pages < 1) {
      setError("Compila titolo, autore e un numero di pagine valido.");
      return;
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setError("Sessione non valida.");
      return;
    }

    setBusy(true);

    try {
      if (setAsCurrent) {
        const { error: clearErr } = await supabase
          .from("books")
          .update({ is_current_book: false })
          .eq("is_current_book", true);
        if (clearErr) throw clearErr;
      }

      const { data: book, error: insErr } = await supabase
        .from("books")
        .insert({
          title: title.trim(),
          author: author.trim(),
          total_pages: pages,
          cover_url: null,
          is_current_book: setAsCurrent,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (insErr || !book) throw insErr ?? new Error("Inserimento fallito");

      let coverUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${book.id}/cover.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("covers")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
        coverUrl = pub.publicUrl;
        const { error: updErr } = await supabase
          .from("books")
          .update({ cover_url: coverUrl })
          .eq("id", book.id);
        if (updErr) throw updErr;
      }

      void navigate(`/libri/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-sage-dark underline"
        >
          ← Home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
          Aggiungi un libro
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Solo l&apos;admin può pubblicare nuovi titoli e copertine.
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
            placeholder="Es. 416"
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="cover" className="block text-sm font-medium text-ink">
            Copertina (immagine)
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
          Imposta subito come libro corrente del club
        </label>

        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-cocoa px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Salvataggio…" : "Salva libro"}
        </button>
      </form>
    </div>
  );
}
