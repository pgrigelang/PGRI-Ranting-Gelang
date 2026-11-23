with open("src/main.tsx", "r") as f:
    content = f.read()

security_code = """
// Security checks to prevent F12 and Context Menu
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
    (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
  ) {
    e.preventDefault();
  }
});
"""

if "contextmenu" not in content:
    new_content = content.replace("createRoot(", security_code + "\ncreateRoot(")
    with open("src/main.tsx", "w") as f:
        f.write(new_content)
