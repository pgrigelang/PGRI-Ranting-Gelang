with open("src/components/Header.tsx", "r") as f:
    c = f.read()

c = c.replace("isSyncing?: boolean;};", "isSyncing?: boolean;")

with open("src/components/Header.tsx", "w") as f:
    f.write(c)
