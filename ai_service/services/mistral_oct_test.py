import os
from mistralai import Mistral

# Set your API key from environment variables
api_key = "hbge2PpKfUY6uQ7gM9QQybsfYfUycyA4"
client = Mistral(api_key=api_key)

# Path to local PDF file
pdf_path = "ai_service/test_img/img/pdf.pdf"

# Upload the PDF file to Mistral
uploaded_pdf = client.files.upload(
    file={
        "file_name": "pdf.pdf",
        "content": open(pdf_path, "rb"),
    },
    purpose="ocr"
)

# Get signed URL for the uploaded file
signed_url = client.files.get_signed_url(file_id=uploaded_pdf.id)

# Process the document using OCR
ocr_response = client.ocr.process(
    model="mistral-ocr-latest",
    document={
        "type": "document_url",
        "document_url": signed_url.url,
    },
    include_image_base64=True
)

print(ocr_response)