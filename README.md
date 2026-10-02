# あと何日？

「この場所にあと何日いるか」を、カレンダー日と複数の除外パターンで確認するためのWebアプリです。

## 主な機能

- 今日と最終日を含めた残日数
- 最終日当日は「最終日」、翌日以降は「到達しました」
- 土曜・日曜・日本の祝日を除外したパターン
- カレンダーをタップして個別に「カウント／除外」を反転
- 1目標あたり最大3パターン
- localStorage 自動保存
- 設定JSONの書き出し・読み込み
- GitHub Pages 対応

詳細は [SPEC.md](./SPEC.md) を参照してください。

## 開発

```bash
npm install
npm run dev
```

ビルド:

```bash
npm run build
```

## GitHub Pages

`main` ブランチへの push で `.github/workflows/deploy.yml` がビルド・公開します。

リポジトリの **Settings > Pages > Build and deployment > Source** が GitHub Actions になっていることを確認してください。
