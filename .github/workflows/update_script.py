import os
import requests
import json
from datetime import datetime

# 環境変数から秘密情報を取得
DISCORD_BOT_TOKEN = os.environ['DISCORD_BOT_TOKEN']
GITHUB_TOKEN = os.environ['GH_PAT']
GITHUB_USER = os.environ['GITHUB_USER']
GITHUB_REPO = os.environ['GITHUB_REPO']

# 監視するDiscordチャンネルID
ANNOUNCEMENT_CHANNEL_ID = "1393963700569767968" # ここはあなたのIDに書き換えてください

# 最後に処理したメッセージIDを保存するファイル
LAST_ID_FILE = '.github/workflows/last_message_id.txt'
ANNOUNCEMENTS_FILE = 'announcements.json'

def get_latest_discord_message():
    """Discordから最新のメッセージを1件取得する"""
    url = f"https://discord.com/api/v10/channels/{ANNOUNCEMENT_CHANNEL_ID}/messages?limit=1"
    headers = {'Authorization': f'Bot {DISCORD_BOT_TOKEN}'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()[0]

def get_file_from_github(path):
    """GitHubからファイルを取得する"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3.raw'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def update_file_on_github(path, content, sha):
    """GitHubのファイルを更新する"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
    # Base64エンコードはGitHub Actionsのコミットステップで行うため、ここでは不要
    # Pythonスクリプト内で直接コミットする場合はエンコードが必要
    # ここではファイルに書き出すだけ
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=2)


# メイン処理
try:
    print("処理開始...")
    latest_message = get_latest_discord_message()
    print(f"最新メッセージ取得: {latest_message['id']}")

    last_processed_id = ""
    if os.path.exists(LAST_ID_FILE):
        with open(LAST_ID_FILE, 'r') as f:
            last_processed_id = f.read().strip()
    print(f"前回処理ID: {last_processed_id or 'なし'}")

    if latest_message['id'] != last_processed_id:
        print("新しいメッセージを検知。ファイルを更新します。")

        # 現在のannouncements.jsonを取得
        try:
            announcements = get_file_from_github(ANNOUNCEMENTS_FILE)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print("announcements.jsonが見つからないため、新規作成します。")
                announcements = []
            else:
                raise e

        # 新しいお知らせを作成して先頭に追加
        timestamp = datetime.fromisoformat(latest_message['timestamp'])
        new_entry = {
            "date": timestamp.strftime('%Y/%m/%d'),
            "content": latest_message['content'].replace('\n', '<br>')
        }
        announcements.insert(0, new_entry)

        # 更新した内容をファイルに書き出す（コミットはYAML側で行う）
        with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(announcements, f, ensure_ascii=False, indent=2)

        # 処理したIDをファイルに保存
        with open(LAST_ID_FILE, 'w') as f:
            f.write(latest_message['id'])

        print(f"ファイル更新完了: {new_entry['content']}")
    else:
        print("新しいメッセージはありません。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
