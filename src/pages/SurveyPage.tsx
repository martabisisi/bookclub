import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookCover } from "@/components/BookCover";
import { supabase } from "@/lib/supabase";
import type { BookSuggestion, Profile, SuggestionVote } from "@/types/database";

type Row = BookSuggestion & {
  profiles?: Pick<Profile, "nome" | "slug"> | null;
  vote_count: number;
  my_vote_count: number;
};

async function uploadSuggestionCover(
  userId: string,
  suggestionId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `suggestions/${userId}/${suggestionId}/cover.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("covers")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
  return pub.publicUrl;
}

export function SurveyPage({ userId }: { userId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [draftCoverFile, setDraftCoverFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const myProposals = useMemo(() => {
    if (!userId) return [];
    return rows
      .filter((r) => r.suggested_by === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [rows, userId]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const [
        { data: suggestions, error: sErr },
        { data: votes, error: vErr },
        { data: profiles },
      ] = await Promise.all([
        supabase.from("book_suggestions").select("*"),
        supabase.from("suggestion_votes").select("*"),
        supabase.from("profiles").select("*"),
      ]);

      if (sErr || vErr) {
        if (!silent) {
          setError(sErr?.message ?? vErr?.message ?? "Errore caricamento");
          setLoading(false);
        }
        return;
      }

      const profByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const votesList = votes ?? [];
      const countBySuggestion = new Map<string, number>();
      const myVoteCountBySuggestion = new Map<string, number>();

      votesList.forEach((v: SuggestionVote) => {
        countBySuggestion.set(
          v.suggestion_id,
          (countBySuggestion.get(v.suggestion_id) ?? 0) + 1
        );
        if (userId && v.user_id === userId) {
          myVoteCountBySuggestion.set(
            v.suggestion_id,
            (myVoteCountBySuggestion.get(v.suggestion_id) ?? 0) + 1
          );
        }
      });

      const sugList = suggestions ?? [];

      const enriched: Row[] = sugList.map((s) => ({
        ...s,
        profiles: profByUser.get(s.suggested_by) ?? null,
        vote_count: countBySuggestion.get(s.id) ?? 0,
        my_vote_count: myVoteCountBySuggestion.get(s.id) ?? 0,
      }));

      enriched.sort((a, b) => {
        if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRows(enriched);
      setError(null);
      if (!silent) setLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!editingId) return;
    const s = rowsRef.current.find((r) => r.id === editingId);
    if (s) {
      setEditTitle(s.title);
      setEditAuthor(s.author);
      setEditReason(s.reason ?? "");
      setEditCoverFile(null);
    }
  }, [editingId]);

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError(null);
    const { data: inserted, error: insErr } = await supabase
      .from("book_suggestions")
      .insert({
        title: draftTitle.trim(),
        author: draftAuthor.trim(),
        reason: draftReason.trim(),
        suggested_by: userId,
      })
      .select()
      .single();

    if (insErr) {
      setBusy(false);
      setError(insErr.message);
      return;
    }

    try {
      if (draftCoverFile && inserted) {
        const url = await uploadSuggestionCover(userId, inserted.id, draftCoverFile);
        const { error: updErr } = await supabase
          .from("book_suggestions")
          .update({ cover_url: url })
          .eq("id", inserted.id);
        if (updErr) throw updErr;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento copertina");
      setBusy(false);
      return;
    }

    setDraftTitle("");
    setDraftAuthor("");
    setDraftReason("");
    setDraftCoverFile(null);
    setBusy(false);
    await load({ silent: true });
  }

  async function saveEditedSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !editingId) return;
    const current = rows.find((r) => r.id === editingId);
    if (!current) return;

    setBusy(true);
    setError(null);
    try {
      let coverUrl: string | null = current.cover_url;
      if (editCoverFile) {
        coverUrl = await uploadSuggestionCover(userId, current.id, editCoverFile);
      }
      const { error: updErr } = await supabase
        .from("book_suggestions")
        .update({
          title: editTitle.trim(),
          author: editAuthor.trim(),
          reason: editReason.trim(),
          ...(coverUrl !== current.cover_url ? { cover_url: coverUrl } : {}),
        })
        .eq("id", current.id)
        .eq("suggested_by", userId);
      if (updErr) throw updErr;
      setEditCoverFile(null);
      setEditingId(null);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSuggestion(suggestionId: string) {
    if (!userId) return;
    if (
      !window.confirm(
        "Eliminare questa proposta? I voti raccolti andranno persi."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const { error: delErr } = await supabase
      .from("book_suggestions")
      .delete()
      .eq("id", suggestionId)
      .eq("suggested_by", userId);
    setBusy(false);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    if (editingId === suggestionId) {
      setEditingId(null);
    }
    await load({ silent: true });
  }

  async function addVote(suggestionId: string) {
    if (!userId) return;
    setBusy(true);
    setError(null);
    const { error: vErr } = await supabase.from("suggestion_votes").insert({
      suggestion_id: suggestionId,
      user_id: userId,
    });
    setBusy(false);
    if (vErr) {
      setError(vErr.message);
      return;
    }
    await load({ silent: true });
  }

  /**
   * 1) RPC (bypass RLS, toglie un solo like).
   * 2) Se la RPC non c’è o fallisce: DELETE di tutti i voti tuoi su quella proposta (serve policy votes_delete_own).
   */
  async function removeOneVote(suggestionId: string) {
    if (!userId) return;
    setBusy(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc(
      "remove_one_suggestion_vote",
      { p_suggestion_id: suggestionId }
    );

    if (!rpcErr) {
      setBusy(false);
      await load({ silent: true });
      return;
    }

    const { data: deletedRows, error: delErr } = await supabase
      .from("suggestion_votes")
      .delete()
      .eq("suggestion_id", suggestionId)
      .eq("user_id", userId)
      .select("id");

    setBusy(false);
    if (delErr) {
      setError(
        `Non è stato possibile togliere il like (${delErr.message}). Apri Supabase → SQL Editor, esegui tutto il file supabase/apply_vote_removal.sql, poi in Dashboard → Settings → API premi «Restart» o attendi un minuto e riprova.`
      );
      return;
    }
    if (!deletedRows?.length) {
      setError(
        "Il database non ha eliminato righe: esegui supabase/apply_vote_removal.sql nel SQL Editor del progetto giusto, poi riavvia l’API (Settings → API) o attendi qualche minuto."
      );
      return;
    }
    await load({ silent: true });
  }

  if (loading && rows.length === 0 && !error) {
    return <p className="text-ink-muted">Caricamento survey…</p>;
  }

  const formFieldsClass =
    "mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-sm text-ink outline-none ring-sage focus:ring-2";
  const fileInputClass =
    "mt-1 w-full text-sm text-ink-muted file:mr-2 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white";

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Prossimo libro
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Puoi pubblicare tutte le proposte che vuoi; tutte possono dare più
          &quot;Mi piace&quot; (anche alle proprie). Clic di nuovo sul bottone per
          togliere un like.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink">
          Classifica (si aggiorna da sola ogni pochi secondi)
        </h2>
        <ol className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <li className="text-sm text-ink-muted">
              Nessuna proposta ancora. Sii la prima!
            </li>
          ) : (
            rows.map((s, idx) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border border-card-border bg-parchment/40 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="w-20 shrink-0 sm:w-24">
                    <BookCover title={s.title} coverUrl={s.cover_url} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sage-dark">
                      #{idx + 1} · {s.vote_count}{" "}
                      {s.vote_count === 1 ? "preferenza" : "preferenze"}
                    </p>
                    <p className="font-display text-lg font-semibold text-ink">
                      {s.title}
                    </p>
                    <p className="text-sm text-ink-muted">{s.author}</p>
                    <p className="mt-1 text-sm text-ink-muted">{s.reason}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      Proposta di{" "}
                      <span className="font-medium text-ink">
                        {s.profiles?.nome ?? "Lettrice"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {userId ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void (s.my_vote_count > 0
                            ? removeOneVote(s.id)
                            : addVote(s.id))
                        }
                        className={
                          s.my_vote_count > 0
                            ? "rounded-xl border-2 border-sage/60 bg-parchment px-4 py-2 text-sm font-semibold text-sage-dark shadow-sm hover:bg-sage/15 disabled:cursor-not-allowed disabled:opacity-60"
                            : "rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-60"
                        }
                      >
                        {s.my_vote_count > 0
                          ? "Togli un like"
                          : "Mi piace +1"}
                      </button>
                      {s.my_vote_count > 0 ? (
                        <span className="text-center text-xs text-ink-muted sm:text-right">
                          Da te: {s.my_vote_count}{" "}
                          {s.my_vote_count === 1 ? "preferenza" : "preferenze"}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink">
          Le tue proposte
        </h2>
        {!userId ? (
          <p className="mt-2 text-sm text-ink-muted">Accedi per proporre.</p>
        ) : (
          <>
            {myProposals.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                Non hai ancora pubblicato proposte. Usa il modulo sotto.
              </p>
            ) : (
              <ul className="mt-4 space-y-6">
                {myProposals.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-card-border bg-parchment/30 p-4"
                  >
                    {editingId === p.id ? (
                      <form
                        onSubmit={(e) => void saveEditedSuggestion(e)}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-xs font-medium text-ink">
                            Titolo
                          </label>
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                            className={formFieldsClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink">
                            Autore
                          </label>
                          <input
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            required
                            className={formFieldsClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink">
                            Perché consigliarlo
                          </label>
                          <textarea
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            required
                            rows={3}
                            className={formFieldsClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink">
                            Copertina (opzionale, sostituisce la precedente)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setEditCoverFile(e.target.files?.[0] ?? null)
                            }
                            className={fileInputClass}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={busy}
                            className="rounded-xl bg-cocoa px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {busy ? "Salvataggio…" : "Salva modifiche"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(null);
                              setEditCoverFile(null);
                            }}
                            className="rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-ink-muted hover:bg-parchment"
                          >
                            Annulla
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="w-24 shrink-0 self-start sm:w-28">
                            <BookCover
                              title={p.title}
                              coverUrl={p.cover_url}
                            />
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-display text-lg font-semibold text-ink">
                              {p.title}
                            </p>
                            <p className="text-ink-muted">{p.author}</p>
                            <p className="mt-2 text-ink-muted">{p.reason}</p>
                            <p className="mt-2 text-xs text-ink-muted">
                              {p.vote_count}{" "}
                              {p.vote_count === 1
                                ? "preferenza"
                                : "preferenze"}{" "}
                              in classifica
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(p.id);
                              setEditCoverFile(null);
                            }}
                            className="rounded-xl border border-sage/50 bg-parchment px-4 py-2 text-sm font-semibold text-sage-dark hover:bg-sage/10 disabled:opacity-60"
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void deleteSuggestion(p.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                          >
                            Elimina
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 border-t border-card-border pt-6">
              <h3 className="font-display text-base font-semibold text-ink">
                Nuova proposta
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                Aggiungi un altro titolo al sondaggio.
              </p>
              <form onSubmit={(e) => void propose(e)} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink">
                    Titolo
                  </label>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    required
                    className={formFieldsClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink">
                    Autore
                  </label>
                  <input
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    required
                    className={formFieldsClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink">
                    Perché consigliarlo
                  </label>
                  <textarea
                    value={draftReason}
                    onChange={(e) => setDraftReason(e.target.value)}
                    required
                    rows={3}
                    className={formFieldsClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink">
                    Copertina (opzionale)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setDraftCoverFile(e.target.files?.[0] ?? null)
                    }
                    className={fileInputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-cocoa px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Invio…" : "Pubblica proposta"}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
