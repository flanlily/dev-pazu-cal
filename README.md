# Discord Bot for updating announcements.json

## 必要なファイル
- bot.py
- announcements.json（自動生成されます）
- requirements.txt

## 使い方

1. 依存パッケージのインストール

```
pip install -r requirements.txt
```

2. Discord Botのトークンを環境変数に設定

Windows PowerShellの場合：

```
$env:DISCORD_BOT_TOKEN = "あなたのボットトークン"
```

3. Botの起動

```
python bot.py
```

または、トークンを引数で渡すこともできます：

```
python bot.py あなたのボットトークン
```

## コマンド一覧

- `!announce <内容>` : お知らせを追加
- `!show_announcements` : お知らせ一覧を表示

---

## GitHubで動かす場合

GitHub ActionsやCodespacesで動かす場合は、
- `DISCORD_BOT_TOKEN` をリポジトリのシークレットに設定してください。
- 必要に応じて `.github/workflows` にワークフローを追加してください。

例: `.github/workflows/bot.yml`
