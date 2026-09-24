from flask import Flask, render_template, request, url_for, send_from_directory, redirect, jsonify
from flask_wtf import FlaskForm 
from wtforms import FileField, IntegerField, SubmitField, HiddenField
from werkzeug import run_simple
from werkzeug.utils import secure_filename
from utils.models import VGGEncoder, Decoder
from utils.utils import adaIn_normalization
import io
import base64
from PIL import Image
import torch
from torchvision import transforms

app = Flask(__name__)
app.secret_key = "secret_key"
app.config["allowed_extensions"] = ["png", "jpg", "jpeg"]
app.config["upload_folder"] = "static/uploads"

class uploadForm(FlaskForm):
    content = FileField("Content Image")
    style = FileField("Style Image")
    content_path = HiddenField()
    style_path = HiddenField()
    alpha = IntegerField("Alpha", default=50)
    submit = SubmitField("Generate")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu") 

encoder = VGGEncoder("models/vgg_normalised.pth").to(device)
decoder = Decoder().to(device)
decoder.load_state_dict(torch.load("models/decoder.zip", map_location=torch.device("cpu")))

def allowed_file(filename:str):
    return "." in filename and \
            filename.rsplit(".")[1].lower() in app.config["allowed_extensions"]

def convert_to_b64(image_tensor):
    image_tensor = image_tensor.to("cpu").clone()
    image_tensor = image_tensor.squeeze(0)
    image_tensor = image_tensor.clamp(0, 1)
    pil_img = transforms.ToPILImage()(image_tensor)

    buffer = io.BytesIO()
    pil_img.save(buffer, format="png")
    buffer.seek(0)

    b64_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return b64_img

def style_transfer(content_image, style_image, alpha):

    alpha = alpha / 100

    image_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.ToTensor()
    ])

    content_image = image_transform(content_image).unsqueeze(0).to(device)
    style_image = image_transform(style_image).unsqueeze(0).to(device)

    encoder.eval()
    decoder.eval()

    with torch.no_grad():
        content_feats = encoder(content_image, is_test=True)
        style_feats = encoder(style_image, is_test=True)

        stylized_feats = adaIn_normalization(content_feats, style_feats)
        stylized_feats = alpha * stylized_feats + (1 - alpha) * content_feats

        stylized_image = decoder(stylized_feats)

        return stylized_image


@app.route("/", methods=["GET", "POST"])
def index():
    form = uploadForm()
    content_filename = None
    content_bytes = None

    style_filename = None
    style_bytes = None

    result_image = None
    error = None
    if form.validate_on_submit():
        if form.content.data and form.content.data.filename:
            if allowed_file(form.content.data.filename):
                content_bytes = form.content.data.read()
                content_filename = secure_filename("content_" + form.content.data.filename)
                form.content.data.seek(0)
                
        if form.style.data and form.style.data.filename:
            if allowed_file(form.style.data.filename):
                style_bytes = form.style.data.read()
                form.style.data.seek(0)

        if content_bytes and style_bytes:
            content_image = Image.open(io.BytesIO(content_bytes)).convert("RGB")
            style_image = Image.open(io.BytesIO(style_bytes)).convert("RGB")
            try:

                alpha = form.alpha.data
                stylized_image = style_transfer(content_image, style_image, alpha)

                result_filename = "stylized_" + content_filename

                result_image = convert_to_b64(stylized_image)

            except Exception as e:
                error = str(e)

            return jsonify({
                "result_image" : result_image,
                "error" : error
            })
    else:
        if not form.content.data:
            error = "Content image not uploaded"
        if not form.style.data:
            error = "Style image not uploaded"

    return render_template("index.html",form=form, result_image=result_image, error=error)