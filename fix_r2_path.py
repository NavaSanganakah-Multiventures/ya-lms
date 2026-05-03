with open('src/index.ts', 'r') as f:
    content = f.read()

content = content.replace("const objectKey = `recordings/${session.batch_id || 'general'}/${session.course_id}/${recordingId}.mp4`;",
"const objectKey = `${session.course_id}/${session.batch_id || 'general'}/recording/${session.id}_${session.rtc_room_id}.mp4`;")

with open('src/index.ts', 'w') as f:
    f.write(content)
