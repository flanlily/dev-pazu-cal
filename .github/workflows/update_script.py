import os
import requests
import json
from datetime import datetime
import base64
from dotenv import load_dotenv # ◀◀◀ この行を追加

# .envファイルが存在すれば、その中の変数を環境変数として読み込む
load_dotenv() # ◀◀◀ この行を追加

# 環境変数から秘密情報を取得（この後のコードは変更なし）
DISCORD_BOT_TOKEN = os.environ['DISCORD_BOT_TOKEN']
GITHUB_TOKEN = os.environ['GH_PAT']
GITHUB_USER = os.environ['GITHUB_USER']
GITHUB_REPO = os.environ['GITHUB_REPO']

# 監視するDiscordチャンネルID
# .envファイルに記述があればそちらを優先、なければ直接記述されたものを使う
ANNOUNCEMENT_CHANNEL_ID = os.getenv('ANNOUNCEMENT_CHANNEL_ID', "1393963700569767968")

# ファイルのパス
ANNOUNCEMENTS_FILE_PATH = 'announcements.json'
LAST_ID_FILE_PATH = '.github/workflows/last_message_id.txt'

def get_latest_discord_message():
    """Discordから最新のメッセージを1件取得する"""
    url = f"https://discord.com/api/v10/channels/{ANNOUNCEMENT_CHANNEL_ID}/messages?limit=1"
    headers = {'Authorization': f'Bot {DISCORD_BOT_TOKEN}'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        messages = response.json()
        return messages[0] if messages else None
    except requests.exceptions.RequestException as e:
        print(f"Discordへのリクエストでエラー: {e}")
        return None

def get_github_file(path):
    """GitHubからファイルを取得する (SHAを含む)"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 404:
            return None, None # ファイルが存在しない
        response.raise_for_status()
        data = response.json()
        content = base64.b64decode(data['content']).decode('utf-8')
        return content, data['sha']
    except requests.exceptions.RequestException as e:
        print(f"GitHubからのファイル取得でエラー ({path}): {e}")
        return None, None

def update_github_file(path, content_string, sha, commit_message):
    """GitHubのファイルを更新または新規作成する"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    encoded_content = base64.b64encode(content_string.encode('utf-8')).decode('utf-8')
    data = {
        "message": commit_message,
        "content": encoded_content
    }
    if sha:
        data["sha"] = sha
    
    response = requests.put(url, headers=headers, json=data)
    response.raise_for_status()
    print(f"GitHubのファイルを更新/作成しました: {path}")

# --- メイン処理 ---
try:
    print("処理開始...")
    latest_message = get_latest_discord_message()
    if not latest_message:
        print("Discordからメッセージを取得できませんでした。処理を終了します。")
        exit()
    
    print(f"最新メッセージ取得: {latest_message['id']}")

    last_processed_id, last_id_sha = get_github_file(LAST_ID_FILE_PATH)
    print(f"前回処理ID: {last_processed_id.strip() if last_processed_id else 'なし'}")

    if not last_processed_id or latest_message['id'] != last_processed_id.strip():
        print("新しいメッセージを検知。ファイルを更新します。")

        announcements_content, announcements_sha = get_github_file(ANNOUNCEMENTS_FILE_PATH)
        announcements = json.loads(announcements_content) if announcements_content else []

        timestamp = datetime.fromisoformat(latest_message['timestamp'])
        new_entry = {
            "date": timestamp.strftime('%Y/%m/%d'),
            "content": latest_message['content'].replace('\n', '<br>')
        }
        announcements.insert(0, new_entry)
        
        updated_announcements_string = json.dumps(announcements, ensure_ascii=False, indent=2)
        update_github_file(ANNOUNCEMENTS_FILE_PATH, updated_announcements_string, announcements_sha, f"[Bot] Update announcements.json")

        update_github_file(LAST_ID_FILE_PATH, latest_message['id'], last_id_sha, f"[Bot] Update last message ID")

        print(f"ファイル更新完了: {new_entry['content']}")
    else:
        print("新しいメッセージはありません。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
    exit(1)
