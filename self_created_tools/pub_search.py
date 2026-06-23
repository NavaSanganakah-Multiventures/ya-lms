import sys
import json
import urllib.request

def search_pub(query):
    url = f"https://pub.dev/api/search?q={urllib.parse.quote(query)}"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            packages = [pkg['package'] for pkg in data.get('packages', [])]
            print(f"Search results for '{query}':")
            for pkg in packages:
                print(f" - {pkg}")
    except Exception as e:
        print(f"Error searching pub.dev: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        search_pub(sys.argv[1])
    else:
        print("Usage: python pub_search.py <query>")
