with open('src/components/views/SertifikatView.tsx', 'r') as f:
    content = f.read()

new_content = content.replace('console.warn("Error fetching settings:", error);', """
        if (error && error.message && error.message.includes('Quota')) {
          // diam saja
        } else {
          console.info("Info fetching settings:", error);
        }
""")

with open('src/components/views/SertifikatView.tsx', 'w') as f:
    f.write(new_content)
