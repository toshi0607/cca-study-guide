import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cards } from '../content/cards';
import { domains } from '../content/domains';
import { sourceById, sources, VERIFIED_AT } from '../content/sources';
import { isDue, scheduleReview, type Rating, type ReviewState } from '../lib/scheduler';
import { createStudyStorage, type StudyData } from '../lib/storage';

type View = 'today' | 'guide' | 'practice' | 'progress';
const labels: Record<View, string> = { today: '今日', guide: 'ガイド', practice: '練習', progress: '進捗' };
const icons: Record<View, string> = { today: '⌂', guide: '▤', practice: '◇', progress: '✓' };

function studyStorage() {
  try {
    return createStudyStorage(window.localStorage);
  } catch {
    return createStudyStorage(undefined);
  }
}

function SourceLinks({ ids }: { ids: string[] }) {
  return <ul class="source-links">{ids.map((id) => {
    const source = sourceById.get(id);
    return source ? <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span class="sr-only">（新しいタブで開く）</span> ↗</a></li> : null;
  })}</ul>;
}

function Blueprint({ reviews }: { reviews: Record<string, ReviewState> }) {
  const progress = (domainId: string) => {
    const domainCards = cards.filter((card) => card.domainId === domainId);
    return Math.round((domainCards.filter((card) => reviews[card.id]).length / domainCards.length) * 100);
  };
  return (
    <section class="blueprint" aria-labelledby="coverage-title">
      <div class="section-heading"><div><p class="eyebrow">EXAM BLUEPRINT</p><h2 id="coverage-title">5領域の設計図</h2></div><p>ノード内の帯はカード着手率</p></div>
      <div class="blueprint-map">
        <svg class="blueprint-lines" viewBox="0 0 1000 300" aria-hidden="true"><path d="M125 88 H380 L500 210 H680 L810 85"/><path d="M380 88 H810"/><circle cx="380" cy="88" r="5"/><circle cx="500" cy="210" r="5"/></svg>
        {domains.map((domain, index) => <div class={`blueprint-node node-${index + 1}`} key={domain.id}>
          <div class="node-copy"><span>D{domain.number}</span><strong>{domain.weight}%</strong></div>
          <div class="node-progress" style={{ '--progress': `${progress(domain.id)}%` }}><span>{progress(domain.id)}% 着手</span></div>
          <p>{domain.titleJa}</p>
        </div>)}
      </div>
    </section>
  );
}

function App({ analyticsEnabled = false }: { analyticsEnabled?: boolean }) {
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>({ version: 1, reviews: {} });
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<'due' | 'all' | 'unseen' | 'reviewed'>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setData(studyStorage().load());
    setReady(true);
  }, []);

  const now = new Date();
  const dueCards = cards.filter((card) => isDue(data.reviews[card.id], card.revision, now));
  const reviewedCount = Object.keys(data.reviews).filter((id) => cards.some((card) => card.id === id)).length;
  const filteredCards = useMemo(() => cards.filter((card) => {
    const text = `${card.prompt} ${card.answer} ${card.explanation}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesDomain = domainFilter === 'all' || card.domainId === domainFilter;
    const review = data.reviews[card.id];
    const matchesState = stateFilter === 'all' || (stateFilter === 'unseen' ? !review : stateFilter === 'reviewed' ? Boolean(review) : isDue(review, card.revision, now));
    return matchesQuery && matchesDomain && matchesState;
  }), [query, domainFilter, stateFilter, data]);

  const saveRating = (cardId: string, rating: Rating) => {
    const currentCard = cards.find((card) => card.id === cardId)!;
    const reviews = { ...data.reviews, [cardId]: scheduleReview(cardId, currentCard.revision, rating, data.reviews[cardId]) };
    const next = { version: 1 as const, reviews };
    if (!studyStorage().save(next)) {
      setNotice('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。');
      requestAnimationFrame(() => noticeRef.current?.focus());
      return;
    }
    setData(next);
    setRevealed((value) => ({ ...value, [cardId]: false }));
    setNotice(rating === 'again' ? '10分後にもう一度表示します。' : rating === 'hard' ? '明日もう一度確認します。' : 'できた：次の復習日を更新しました。');
    requestAnimationFrame(() => noticeRef.current?.focus());
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'CCA Field Notes', ...data }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('進捗をJSONで書き出しました。');
  };

  const resetData = () => {
    if (!window.confirm('この端末の学習進捗をすべて削除します。元に戻せません。')) return;
    if (!studyStorage().reset()) {
      setNotice('進捗を削除できませんでした。ブラウザのサイトデータ設定を確認してください。');
      requestAnimationFrame(() => noticeRef.current?.focus());
      return;
    }
    setData({ version: 1, reviews: {} });
    setRevealed({});
    setNotice('この端末の進捗を削除しました。');
  };

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div class="app-shell">
    <header class="mobile-header"><div class="wordmark"><b>CCA</b><span>FIELD NOTES</span></div><span class="unofficial">非公式</span></header>
    <aside class="rail">
      <div><div class="wordmark"><b>CCA</b><span>FIELD NOTES</span></div><p class="edition">FOUNDATIONS / CCAR-F<br/>JULY 2026 EDITION</p></div>
      <nav aria-label="メインナビゲーション">{(Object.keys(labels) as View[]).map((key) => <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{labels[key]}</button>)}</nav>
      <p class="rail-note"><strong>非公式</strong><br/>Anthropicとは<br/>提携していません</p>
    </aside>

    <main id="main-content">
      <h1 class="sr-only">CCA Field Notes — Claude Certified Architect非公式学習ガイド</h1>
      <p ref={noticeRef} class="notice" tabIndex={-1} aria-live="polite">{notice}</p>
      {view === 'today' && <div class="view-stack">
        <section class="today-hero" aria-labelledby="today-title">
          <div><p class="eyebrow">TODAY · {new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(now)}</p><h2 id="today-title">思い出してから、<br/><em>答えを開く。</em></h2><p>公開されている出題範囲を、短い想起練習にしました。カードはすべて独自作成です。</p></div>
          <div class="due-block"><span>今日の復習</span><strong>{ready ? dueCards.length : '—'}</strong><span>cards due</span><button onClick={() => { setStateFilter('due'); navigate('practice'); }}>復習を始める <span aria-hidden="true">→</span></button></div>
        </section>
        <Blueprint reviews={data.reviews}/>
        <section class="status-strip" aria-labelledby="status-title"><div><p class="eyebrow">LOCAL PROGRESS</p><h2 id="status-title">この端末の進捗</h2></div><dl><div><dt>着手</dt><dd>{reviewedCount} / {cards.length}</dd></div><div><dt>未着手</dt><dd>{cards.length - reviewedCount}</dd></div><div><dt>収録範囲</dt><dd>30 objectives</dd></div></dl></section>
      </div>}

      {view === 'guide' && <section class="guide-view" aria-labelledby="guide-title">
        <header class="page-header"><p class="eyebrow">PUBLIC BLUEPRINT / 30 OBJECTIVES</p><h2 id="guide-title">学習ガイド</h2><p>公式Exam Guide v1.0の30タスク領域を、公開ドキュメントに基づく独自の短い要約で整理しています。原文は公式ガイドを確認してください。</p><a class="text-link" href={sourceById.get('exam-guide')?.url} target="_blank" rel="noreferrer">公式Exam Guideを開く ↗</a></header>
        <div class="domain-list">{domains.map((domain) => <section class="domain-section" key={domain.id} aria-labelledby={`${domain.id}-title`}>
          <header><div class="domain-number">D{domain.number}</div><div><p class="eyebrow">WEIGHT {domain.weight}%</p><h3 id={`${domain.id}-title`}>{domain.titleJa}</h3><p>{domain.summary}</p></div></header>
          <div class="objective-grid">{domain.objectives.map((item) => <article class="objective" key={item.id}>
            <div class="objective-title"><code>{item.id}</code><div><h4>{item.titleJa}</h4><p lang="en">{item.title}</p></div></div>
            <p>{item.summary}</p><h5>覚えること</h5><ul>{item.mustKnow.map((point) => <li key={point}>{point}</li>)}</ul>
            <details><summary>公式資料</summary><SourceLinks ids={item.sourceIds}/><small>最終確認 {item.verifiedAt}</small></details>
          </article>)}</div>
        </section>)}</div>
      </section>}

      {view === 'practice' && <section class="practice-view" aria-labelledby="practice-title">
        <header class="page-header compact"><p class="eyebrow">INDEPENDENT RETRIEVAL PRACTICE</p><h2 id="practice-title">練習カード</h2><p>実試験の再現ではありません。まず自分の言葉で答えてから開いてください。</p></header>
        <div class="filter-panel">
          <label class="search-label" for="card-search">カードを検索<input id="card-search" type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="例：MCP、スキーマ、フック"/></label>
          <fieldset><legend>状態</legend><div class="chips">{([['due','復習対象'],['all','すべて'],['unseen','未着手'],['reviewed','着手済み']] as const).map(([key, label]) => <button type="button" class={stateFilter === key ? 'selected' : ''} aria-pressed={stateFilter === key} onClick={() => setStateFilter(key)}>{label}</button>)}</div></fieldset>
          <fieldset><legend>領域</legend><div class="chips"><button type="button" class={domainFilter === 'all' ? 'selected' : ''} aria-pressed={domainFilter === 'all'} onClick={() => setDomainFilter('all')}>すべて</button>{domains.map((domain) => <button type="button" class={domainFilter === domain.id ? 'selected' : ''} aria-pressed={domainFilter === domain.id} onClick={() => setDomainFilter(domain.id)}>D{domain.number}</button>)}</div></fieldset>
        </div>
        <p class="result-count">{filteredCards.length}枚を表示</p>
        <div class="card-stack">{filteredCards.map((card, index) => {
          const domain = domains.find((value) => value.id === card.domainId)!;
          const answerId = `${card.id}-answer`;
          const isOpen = Boolean(revealed[card.id]);
          const review = data.reviews[card.id];
          return <article class="practice-card" key={card.id}>
            <header><div><span class="card-domain">D{domain.number}</span><span>{card.kind === 'recall' ? '想起' : card.kind === 'contrast' ? '比較' : '場面'}</span></div><code>{String(index + 1).padStart(2, '0')} / {String(filteredCards.length).padStart(2, '0')}</code></header>
            <div class="card-prompt"><p class="eyebrow">QUESTION</p><h3>{card.prompt}</h3></div>
            <button class="reveal-button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setRevealed((value) => ({ ...value, [card.id]: !isOpen }))}>{isOpen ? '答えを隠す' : '答えを見る'} <span aria-hidden="true">{isOpen ? '−' : '+'}</span></button>
            {isOpen && <div class="answer" id={answerId}>
              <p class="eyebrow">ANSWER</p><p class="answer-lead">{card.answer}</p><p>{card.explanation}</p>
              <div class="pitfall"><strong>混同注意</strong><p>{card.pitfall}</p></div>
              <div class="card-sources"><strong>公式資料</strong><SourceLinks ids={card.sourceIds}/><small>最終確認 {card.verifiedAt}</small></div>
              <fieldset class="rating"><legend>今の思い出しやすさは？</legend><button onClick={() => saveRating(card.id, 'again')}>もう一度<small>10分後</small></button><button onClick={() => saveRating(card.id, 'hard')}>難しい<small>明日</small></button><button onClick={() => saveRating(card.id, 'good')}>できた<small>{review?.lastRating === 'good' ? '間隔を延長' : '3日後'}</small></button></fieldset>
            </div>}
          </article>;
        })}</div>
        {!filteredCards.length && <div class="empty-state"><strong>該当するカードはありません。</strong><p>検索語またはフィルターを変えてください。</p></div>}
      </section>}

      {view === 'progress' && <section class="progress-view" aria-labelledby="progress-title">
        <header class="page-header"><p class="eyebrow">STUDY DATA: LOCAL ONLY</p><h2 id="progress-title">進捗と資料</h2><p>学習データはこのブラウザのlocalStorageだけに保存され、サーバーへ送信されません。</p></header>
        <section class="progress-panel" aria-labelledby="by-domain"><h3 id="by-domain">領域別の着手</h3>{domains.map((domain) => {
          const list = cards.filter((card) => card.domainId === domain.id);
          const done = list.filter((card) => data.reviews[card.id]).length;
          return <div class="progress-row"><span>D{domain.number} {domain.titleJa}</span><progress value={done} max={list.length}>{done}/{list.length}</progress><strong>{done}/{list.length}</strong></div>;
        })}</section>
        <section class="data-panel" aria-labelledby="data-title"><div><h3 id="data-title">ローカルデータ</h3><p>端末間の同期はありません。ブラウザデータを消す前にJSONを書き出してください。</p>{analyticsEnabled && <p class="analytics-disclosure">許可した場合のみ、基本的なページ閲覧情報をGoogle Analyticsへ送信します。学習内容や進捗は対象外です。</p>}</div><div class="data-actions"><button onClick={exportData}>進捗をJSONで書き出す</button>{analyticsEnabled && <button onClick={() => window.dispatchEvent(new CustomEvent('cca:open-analytics-consent'))}>アクセス解析の設定</button>}<button class="danger" onClick={resetData}>この端末の進捗を削除</button></div></section>
        <section class="sources-panel" aria-labelledby="sources-title"><div><p class="eyebrow">SOURCE REGISTER</p><h3 id="sources-title">公式資料</h3><p>説明は公開資料の要約です。仕様変更に備え、学習時はリンク先の最新版も確認してください。</p></div><div class="source-register">{sources.map((source) => <article><code>{source.id}</code><div><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · 最終確認 {source.verifiedAt}</p></div></article>)}</div></section>
        <section class="disclaimer" aria-labelledby="disclaimer-title"><h3 id="disclaimer-title">非公式・Anthropicとは提携していません</h3><p>本サイトは個人の学習用ノートです。Anthropicによる承認・後援・提携を示すものではありません。練習カードは公開資料から独自に作成したもので、実試験問題、受験者が記憶した問題、非公開教材、漏えい資料を収録・募集しません。</p><p>出題範囲の最終確認：{VERIFIED_AT}。誤りやリンク切れは <a href="https://github.com/toshi0607/cca-study-guide/issues" target="_blank" rel="noreferrer">GitHub Issues ↗</a> でお知らせください。</p></section>
      </section>}
    </main>

    <nav class="bottom-nav" aria-label="メインナビゲーション">{(Object.keys(labels) as View[]).map((key) => <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{labels[key]}</button>)}</nav>
    <div class="persistent-disclaimer">非公式・Anthropicとは提携していません</div>
  </div>;
}

export default App;
