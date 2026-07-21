import type { HandsOnGuide, LocalizedText } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Hands-on steps were verified against the cited official pages on this date.
export const HANDS_ON_VERIFIED_AT = '2026-07-21';

// Exercises the learner runs in their own environment. The guide never carries
// credentials: it says where a secret belongs, never what it is. Guides are
// added incrementally; a later PR renders them.
export const handsOnGuides: HandsOnGuide[] = [
  {
    id: 'ho-ci-review',
    revision: 1,
    title: localized(
      'CIでClaude Codeを非対話実行する',
      'Run Claude Code non-interactively in CI',
    ),
    summary: localized(
      '自分のリポジトリで、差分レビューを非対話実行し、機械可読な出力と最小権限をCIから扱える形にします。',
      'Run a diff review non-interactively against your own repository, then make its output machine-readable and its permissions minimal enough for CI.',
    ),
    domainIds: ['d3'],
    officialScenarioIds: ['claude-code-ci'],
    learningObjectives: localized(
      [
        '対話セッションと非対話実行の違いを、権限と出力の観点で説明できる',
        '許可するツールを明示し、必要以上の権限を与えずに実行できる',
        '実行結果をCIが判定できる形式で取り出せる',
      ],
      [
        'Explain how non-interactive execution differs from an interactive session in permissions and output',
        'Run with an explicit allowlist of tools instead of broad permissions',
        'Extract the result in a form a CI job can evaluate',
      ],
    ),
    prerequisites: localized(
      [
        'Claude Codeが実行できる端末と、自分が変更してよいGitリポジトリ',
        'APIキーを環境変数またはCIのシークレットとして渡せること',
        'JSONを扱うコマンド（jqなど）が使えること',
      ],
      [
        'A machine that can run Claude Code and a Git repository you are allowed to modify',
        'A way to pass the API key as an environment variable or CI secret',
        'A command-line JSON tool such as jq',
      ],
    ),
    estimatedMinutes: 60,
    steps: [
      {
        id: 'step-scope',
        title: localized('レビュー対象と観点を決める', 'Decide the review target and criteria'),
        instructions: localized(
          [
            'レビューしたい差分の範囲（例: main との差分）を決める。',
            '「何を指摘してほしいか」を観察可能な基準として1〜3項目書き出す。曖昧な「品質を上げて」は避ける。',
          ],
          [
            'Decide which diff to review, for example the difference against main.',
            'Write one to three observable criteria for what should be reported. Avoid vague requests such as “improve quality”.',
          ],
        ),
      },
      {
        id: 'step-local-run',
        title: localized('ローカルで非対話実行する', 'Run non-interactively on your machine'),
        instructions: localized(
          [
            '`claude -p "<プロンプト>"` の形式で、対話セッションを開かずに実行する。',
            '差分を標準入力から渡すと、ファイル読み取りの権限を与えずに済むことを確認する。',
            '許可するツールを `--allowedTools` で明示し、指定しなかった操作が自動では実行されないことを確認する。',
          ],
          [
            'Run `claude -p "<prompt>"` so no interactive session is opened.',
            'Pipe the diff through standard input and confirm that no file-read permission is needed.',
            'Name the permitted tools with `--allowedTools`, then confirm that operations you did not list are not run automatically.',
          ],
        ),
      },
      {
        id: 'step-structured-output',
        title: localized('出力を機械可読にする', 'Make the output machine-readable'),
        instructions: localized(
          [
            '`--output-format json` を付けて実行し、結果がメタデータ付きの構造で返ることを確認する。',
            'jqなどで必要なフィールドだけを取り出し、後段のジョブが解釈できる形にする。',
          ],
          [
            'Add `--output-format json` and confirm the result comes back as a structure with metadata.',
            'Extract only the fields you need with jq so the next job can consume them.',
          ],
        ),
      },
      {
        id: 'step-ci-job',
        title: localized('CIジョブへ組み込む', 'Wire it into a CI job'),
        instructions: localized(
          [
            'プルリクエストに対して実行されるジョブとして登録する。',
            'APIキーはCIのシークレットとして渡し、設定ファイルやリポジトリへ書かない。',
            '指摘が見つかった場合にジョブの成否をどう扱うか（失敗させるか、コメントのみか）を決めて実装する。',
          ],
          [
            'Register the command as a job that runs on pull requests.',
            'Pass the API key as a CI secret; never write it into a config file or the repository.',
            'Decide and implement what a finding means for the job outcome: failing the job, or reporting only.',
          ],
        ),
      },
      {
        id: 'step-review-permissions',
        title: localized('権限とシークレットを見直す', 'Review permissions and secrets'),
        instructions: localized(
          [
            '与えたツール権限が、レビューという目的に対して過剰でないか確認する。',
            'ログや出力にシークレットが混ざっていないか確認する。',
          ],
          [
            'Check that the tool permissions you granted are not broader than the review task requires.',
            'Check that no secret appears in the logs or output.',
          ],
        ),
      },
    ],
    deliverables: localized(
      [
        '非対話実行のコマンドを含むスクリプトまたはCIジョブ定義',
        'レビュー観点を書いたプロンプト',
        '1回分の実行結果（JSON）',
      ],
      [
        'A script or CI job definition containing the non-interactive command',
        'The prompt that states the review criteria',
        'One captured run result in JSON',
      ],
    ),
    verification: localized(
      [
        '端末で実行し、対話プロンプトを待たずに終了する',
        '許可していないツールの操作が自動実行されない',
        'CIのログからレビュー結果のフィールドを取り出せる',
        'シークレットがリポジトリにもログにも含まれていない',
      ],
      [
        'The command finishes without waiting for an interactive prompt',
        'Operations using tools you did not allow are not run automatically',
        'The review fields can be extracted from the CI log',
        'No secret appears in the repository or the logs',
      ],
    ),
    cleanup: localized(
      [
        '検証用に作ったジョブやブランチを削除する',
        '検証のために発行したAPIキーを失効させる',
      ],
      [
        'Delete the job and branch created for the exercise',
        'Revoke any API key issued only for the exercise',
      ],
    ),
    relatedCardIds: ['d3-print-mode', 'd3-ci'],
    relatedQuestionIds: ['q-d3-ci-design', 'q-sc-code-ci'],
    sourceIds: ['exam-guide', 'headless', 'code-best-practices'],
    verifiedAt: HANDS_ON_VERIFIED_AT,
  },
];
