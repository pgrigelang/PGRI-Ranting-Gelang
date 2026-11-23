with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

new_content = content.replace('console.warn("Error fetching logo kombel:", err);', """
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('Quota limit exceeded')) {
          console.info("Info fetching logo kombel:", err);
        }
""")

with open('src/components/Header.tsx', 'w') as f:
    f.write(new_content)
