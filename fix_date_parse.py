import re

# To avoid any UTC timezone shift on just a YYYY-MM-DD string that might shift to yesterday in ID locally,
# we should make sure the date is parsed as local time if it's 'YYYY-MM-DD'.
# Actually the simplest way is to append 'T00:00:00' to the date string so it parses as local time, or just let it be (since +0700 makes it 07:00 of the SAME day, which is fine!).
# Let's verify how targetEvt.date is formatted.
pass
