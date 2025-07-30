from ultralytics import YOLO
import cv2
import base64
from PIL import Image
from waitress import serve

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import json
from io import BytesIO

app = Flask(__name__)
CORS(app)

model = YOLO("./model.pt")

treatment_data = {"0":{"class_name":"Caries","title":"Active Carious Lesion Detected","description":"AI analysis has identified an active carious lesion requiring immediate intervention. The detected cavity shows demineralization patterns consistent with bacterial acid production. Prompt restorative treatment is essential to prevent pulpal involvement, secondary infection, and potential tooth loss."},"1":{"class_name":"Crown","title":"Prosthetic Crown Evaluation","description":"Artificial crown restoration identified on tooth structure. Assessment needed for crown retention, marginal fit, and underlying abutment health. Evaluate for potential complications including crown loosening, cement washout, or secondary caries at crown margins."},"2":{"class_name":"Filling","title":"Existing Restoration Assessment","description":"Previous restorative work detected, likely amalgam or composite filling. Clinical evaluation recommended to assess restoration integrity, marginal adaptation, and potential secondary caries formation. Monitor for signs of microleakage or restoration failure."},"3":{"class_name":"Implant","title":"Dental Implant Identified","description":"Osseointegrated dental implant detected. Regular monitoring required for implant stability, peri-implant tissue health, and potential complications such as peri-implantitis. Assess prosthetic component integrity and occlusal relationships."},"4":{"class_name":"Malaligned","title":"Dental Malalignment Detected","description":"Abnormal tooth positioning identified affecting occlusal harmony and function. May contribute to increased caries risk, periodontal disease, and compromised oral hygiene. Orthodontic evaluation recommended for treatment planning."},"5":{"class_name":"Mandibular Canal","title":"Mandibular Canal Visualization","description":"Inferior alveolar nerve canal clearly visualized on radiographic imaging. Important anatomical landmark for surgical planning, especially for implant placement or third molar extraction. Maintain safe distance during procedures."},"6":{"class_name":"Missing Teeth","title":"Tooth Absence Detected","description":"Missing tooth/teeth identified in the dental arch. Assessment needed to determine if congenitally absent or previously extracted. Consider prosthetic replacement options including implants, bridges, or removable prosthetics to restore function and prevent drift."},"7":{"class_name":"Periapical Lesion","title":"Periapical Pathology Detected","description":"Radiolucent lesion identified at root apex, indicating periapical periodontitis or apical granuloma. This suggests pulpal necrosis with bacterial invasion. Immediate endodontic evaluation required for primary treatment or retreatment."},"8":{"class_name":"Retained Root","title":"Retained Root Fragment","description":"Residual root structure detected following incomplete tooth extraction. May serve as nidus for infection or cyst formation. Surgical removal recommended unless asymptomatic and not interfering with prosthetic treatment plans."},"9":{"class_name":"Root Canal Treatment","title":"Endodontically Treated Tooth","description":"Radiographic evidence of previous endodontic therapy. Post-treatment evaluation essential to assess healing response, confirm complete obturation, and rule out persistent periapical pathology or treatment failure requiring retreatment."},"10":{"class_name":"Root Piece","title":"Root Fragment Identification","description":"Isolated root fragment or portion detected. Evaluate for vitality, structural integrity, and potential for restoration. Consider endodontic treatment if vital, or extraction if non-restorable or causing pathology."},"11":{"class_name":"Impacted Tooth","title":"Tooth Impaction Identified","description":"Partially or completely impacted tooth detected. Assessment required for eruption potential and risk of complications including pericoronitis, cystic development, or damage to adjacent teeth. Surgical consultation may be indicated."},"12":{"class_name":"Maxillary Sinus","title":"Maxillary Sinus Visualization","description":"Maxillary sinus cavity clearly visible on imaging. Important anatomical consideration for upper posterior dental procedures. Assess sinus floor proximity for implant planning and evaluate for sinusitis or pathology."},"13":{"class_name":"Bone Loss","title":"Alveolar Bone Loss Detected","description":"Radiographic evidence of bone resorption around tooth roots, typically indicating periodontal disease progression. Comprehensive periodontal evaluation required to assess disease severity and determine appropriate treatment protocol."},"14":{"class_name":"Fractured Teeth","title":"Dental Fracture Identified","description":"Structural discontinuity detected in tooth structure. Assess fracture extent, pulpal involvement, and restorability. Treatment options range from conservative restoration to extraction depending on fracture pattern and remaining tooth structure."},"15":{"class_name":"Permanent Teeth","title":"Permanent Dentition","description":"Adult permanent teeth identified in normal developmental position. Routine maintenance and preventive care recommended. Monitor for caries, periodontal disease, and age-related changes requiring intervention."},"16":{"class_name":"Supra Eruption","title":"Tooth Supra-eruption","description":"Excessive tooth eruption beyond normal occlusal plane detected, often due to loss of opposing tooth. May cause occlusal interference and TMJ problems. Consider crown reduction or prosthetic replacement of opposing tooth."},"17":{"class_name":"TAD","title":"Temporary Anchorage Device","description":"Orthodontic mini-implant or temporary anchorage device identified. Monitor for stability, soft tissue health, and proper function during orthodontic treatment. Remove upon completion of tooth movement phase."},"18":{"class_name":"Abutment","title":"Prosthetic Abutment","description":"Dental abutment component detected, likely supporting crown or bridge restoration. Assess abutment integrity, soft tissue response, and prosthetic fit. Monitor for complications such as loosening or tissue inflammation."},"19":{"class_name":"Attrition","title":"Dental Attrition Pattern","description":"Physiological wear patterns detected on tooth surfaces from normal function. Excessive attrition may indicate bruxism or parafunctional habits. Consider occlusal guard therapy and stress management if pathological wear present."},"20":{"class_name":"Bone Defect","title":"Osseous Defect Identified","description":"Localized bone deficiency detected, possibly from trauma, infection, or developmental anomaly. Evaluate need for bone grafting procedures prior to implant placement or to improve periodontal support."},"21":{"class_name":"Gingival Former","title":"Gingival Forming Component","description":"Soft tissue shaping component identified, typically used during implant healing phase. Monitor healing response and tissue adaptation. Replace with final abutment once optimal gingival contours achieved."},"22":{"class_name":"Metal Band","title":"Orthodontic Metal Band","description":"Orthodontic band cemented on tooth for bracket attachment. Monitor for proper fit, cement seal integrity, and potential decalcification around band margins. Maintain excellent oral hygiene during treatment."},"23":{"class_name":"Orthodontic Brackets","title":"Active Orthodontic Treatment","description":"Orthodontic brackets and wires detected indicating active treatment phase. Monitor for bracket debonding, wire displacement, and oral hygiene maintenance. Regular adjustments required for optimal tooth movement."},"24":{"class_name":"Permanent Retainer","title":"Fixed Orthodontic Retainer","description":"Bonded lingual retainer identified for maintaining tooth position post-orthodontic treatment. Check bond integrity and wire continuity. Emphasize importance of modified oral hygiene techniques and regular monitoring."},"25":{"class_name":"Post-Core","title":"Endodontic Post System","description":"Intraradicular post and core restoration detected in endodontically treated tooth. Assess post retention, core integrity, and potential for root fracture. Monitor periapical healing and crown adaptation."},"26":{"class_name":"Plating","title":"Surgical Fixation Hardware","description":"Orthopedic plating system identified, likely for jaw fracture repair or orthognathic surgery. Monitor healing progress, hardware stability, and potential complications such as infection or hardware failure."},"27":{"class_name":"Wire","title":"Surgical Wire Fixation","description":"Metallic wire fixation detected, commonly used for fracture reduction or orthodontic purposes. Assess wire integrity, tissue response, and need for removal once healing complete or treatment goals achieved."},"28":{"class_name":"Cyst","title":"Cystic Lesion Detected","description":"Radiolucent cystic lesion identified requiring histopathological diagnosis. May be odontogenic or non-odontogenic in origin. Surgical enucleation and biopsy recommended to determine exact nature and appropriate treatment."},"29":{"class_name":"Root Resorption","title":"Root Resorption Process","description":"Pathological root structure loss detected, may be internal or external in nature. Determine etiology and progression rate. Treatment options include endodontic therapy, surgical intervention, or extraction depending on severity."},"30":{"class_name":"Primary Teeth","title":"Deciduous Dentition","description":"Primary teeth identified in pediatric patient. Monitor normal exfoliation timeline and permanent successor development. Maintain primary teeth until natural replacement unless pathology or space management issues arise."}}


@app.route("/")
def index():   
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def home():
    data = request.get_json()
    if 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400
    
    img_data = data['image']
    if img_data.startswith('data:image/jpeg;base64,'):
        img_data = img_data.replace('data:image/jpeg;base64,', '')
    elif img_data.startswith('data:image/png;base64,'):
        img_data = img_data.replace('data:image/png;base64,', '')
    
    try:
        img_bytes = base64.b64decode(img_data)
        img = Image.open(BytesIO(img_bytes))   

        data = predict(img)
        data = format_data(data)  


        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def format_data(data):
    formated_labels = []
    try:
        for i in range(len(data["labelBoxes"])):
            clsId = int(data["curClass"][i]) 
            name = data["classes"][clsId]
            conf = float(data["confidence"][i])
            bbox = [float(box) for box in data["labelBoxes"][i].split(" ")]
            treatment = treatment_data[str(clsId)]

            formated_labels.append({
                "id": i + 1,
                "classId": clsId,
                "name": name,
                "confidence": conf,
                "bbox": {
                    "classId": clsId,
                    "x": bbox[1],
                    "y": bbox[2],
                    "width": bbox[3],
                    "height": bbox[4]
                },
                "treatment": treatment
            })

        formatted_date = {
            "classes": data["classes"],
            "labels": formated_labels
        }

        return formatted_date
    except Exception as e:
        print("Error formatting data:", str(e))
        return jsonify({'error': str(e)}), 500



def get_labels(result):
    boxes = []
    h, w = result[0].orig_shape
    for i in range(len(result[0].boxes.xywh)):
        cls = int(result[0].boxes.cls.tolist()[i])
        x, y, bw, bh = (result[0].boxes.xywh)[i].tolist()
        x /= w
        y /= h
        bw /= w
        bh /= h
        boxes.append(f"{cls} {x:.6f} {y:.6f} {bw:.6f} {bh:.6f}")
    return boxes


def array_to_img(imgArr):
    flag, buffer = cv2.imencode(".png", imgArr)  
    img_str = base64.b64encode(buffer).decode()
    return img_str



def predict(img):
    try:
        result = model.predict(source=img)
        data = {
            # "img": array_to_img(result[0].plot()),
            "classes": result[0].names,
            "labelBoxes": get_labels(result),
            "confidence": result[0].boxes.conf,
            "curClass": result[0].boxes.cls
        }
        return data
    except Exception as e:
        print("prediction error:", str(e))
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    print("Starting the server... at http://localhost:5000")
    serve(app, port=5000, threads=50)
