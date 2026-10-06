import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    content = content.replace('user?.username !== "Vibe_admin"', '!user?.is_superuser')
    content = content.replace('user.username === "Vibe_admin" || user.is_superuser', 'user.is_superuser')
    content = content.replace('user?.role === "super_admin" || user?.is_superuser || user?.username === "Vibe_admin"', 'user?.role === "super_admin" || user?.is_superuser')
    content = content.replace('user?.username === "Vibe_admin"', 'user?.is_superuser')
    content = content.replace('user.username === "Vibe_admin"', 'user.is_superuser')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    base_dir = r"c:\Users\MC VIP\OneDrive\Desktop\HRMS\frontend\src"
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
