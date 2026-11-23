import os
import re

views_dir = "src/components/views"

for filename in os.listdir(views_dir):
    if not filename.endswith("View.tsx"): continue
    
    path = os.path.join(views_dir, filename)
    with open(path, "r") as f:
        content = f.read()
        
    # We want to add `min-h-[240px] sm:min-h-[164px]` before `bg-gradient-to-r` if it's the header banner.
    # The header banner is typically the first `bg-gradient-to-r` in the file.
    # Wait, BerandaView has multiple bg-gradient-to-r (e.g. text gradient).
    
    # In other views, it's: `className="relative overflow-hidden w-full bg-gradient-to-r`
    # Let's replace `w-full bg-gradient-to-r` with `w-full min-h-[240px] sm:min-h-[164px] bg-gradient-to-r`
    
    if filename == "BerandaView.tsx":
        content = content.replace(
            'group animate-banner-entry bg-gradient-to-r',
            'group animate-banner-entry min-h-[240px] sm:min-h-[164px] bg-gradient-to-r'
        )
    else:
        content = content.replace(
            'w-full bg-gradient-to-r',
            'w-full min-h-[240px] sm:min-h-[164px] bg-gradient-to-r'
        )
        
    with open(path, "w") as f:
        f.write(content)

print("Done patching min heights")
