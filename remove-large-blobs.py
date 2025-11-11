def blob_callback(blob, metadata):
    if len(blob.data) > 100 * 1024 * 1024:
        blob.skip()
