import os
import datetime
from fastapi import FastAPI, HTTPException, Query  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles  # type: ignore
from fastapi.responses import FileResponse  # type: ignore
from google import genai  # type: ignore
from google.genai import types  # type: ignore
from dotenv import load_dotenv  # type: ignore
import json

import db
import aqi_model

load_dotenv()

# Initialize Gemini Client if key exists
api_key = os.environ.get("GEMINI_API_KEY")
gemini_client = None
if api_key:
    gemini_client = genai.Client(api_key=api_key)
else:
    print("Warning: GEMINI_API_KEY not found in environment. Gemini features will run in mock mode.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up AeroGuard Server...")
    # Initialize SQLite database
    db.init_db()
    yield
    print("Shutting down AeroGuard Server...")

app = FastAPI(lifespan=lifespan)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ReportRequest(BaseModel):
    city: str
    lat: float
    lng: float
    category: str
    description: str
    photo_url: str = ""

class DispatchRequest(BaseModel):
    report_id: int = None
    ward_name: str
    inspector_name: str
    action_taken: str

class RecommendationRequest(BaseModel):
    city: str
    ward: str
    aqi: int
    weather: dict
    source_attribution: dict

class AdvisoryRequest(BaseModel):
    city: str
    ward: str
    aqi: int
    language: str

# API Endpoints
@app.get("/api/cities")
def get_cities():
    result = []
    for name, data in aqi_model.CITY_PRESETS.items():
        result.append({
            "name": name,
            "center": data["center"],
            "wards_count": len(data["wards"]),
            "point_sources_count": len(data["point_sources"]),
            "base_aqi": data["base_aqi"]
        })
    return result

@app.get("/api/aqi/live")
def get_live_aqi(city: str = Query(..., description="Name of the city")):
    if city not in aqi_model.CITY_PRESETS:
        raise HTTPException(status_code=400, detail="Unsupported city")
    
    # Retrieve active citizen reports for hotspot injection
    reports = db.get_reports(city)
    data = aqi_model.get_live_city_data(city, reports=reports)
    return data

@app.get("/api/aqi/forecast")
def get_forecast(city: str = Query(...), ward: str = Query(...)):
    if city not in aqi_model.CITY_PRESETS:
        raise HTTPException(status_code=400, detail="Unsupported city")
        
    reports = db.get_reports(city)
    data = aqi_model.get_ward_forecast_data(city, ward, reports=reports)
    if not data:
        raise HTTPException(status_code=404, detail="Ward not found in specified city")
    return data

@app.post("/api/recommendations")
def get_gemini_recommendations(req: RecommendationRequest):
    if not gemini_client:
        # Fallback Mock Recommendations if no API key is loaded
        return [
            f"Restrict heavy truck movement in {req.ward} during peak hours.",
            "Deploy municipal water-sprinkling tankers along dust-laden transit corridors.",
            "Enforce immediate suspension of uncovered excavation work at active sites.",
            "Instruct industrial boilers in the surrounding 2km grid to reduce loads by 30%.",
            "Send alerts to local schools to suspend outdoor physical education activities."
        ]
        
    prompt = f"""
    You are an expert AI Smart City Planner and Environmental Enforcement Chief.
    The ward '{req.ward}' in '{req.city}' has a critical AQI of {req.aqi}.
    Current weather parameters:
    - Temperature: {req.weather.get('temperature')}°C
    - Wind: {req.weather.get('wind_speed')} km/h from {req.weather.get('wind_direction')}°
    - Inversion Factor: {req.weather.get('inversion_factor')}x (high means smoke is trapped near the ground)
    
    The local source attribution breakdown is:
    {json.dumps(req.source_attribution, indent=2)}
    
    Generate 5 highly specific, actionable environmental inspector instructions to reduce pollution levels immediately.
    Avoid generalities. Refer to the specific dominant sources. 
    Examples:
    - If construction is high, specify halt or water mist spraying orders.
    - If traffic is high, suggest clean emission checks or route diversions.
    - If waste burning is high, specify dispatching local garbage clearing squads.
    
    Format the output as a clean JSON array of strings. Do not write markdown tags (like ```json), just return the raw JSON array.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING)
                )
            )
        )
        return json.loads(response.text.strip())
    except Exception as e:
        print("Gemini API Error:", e)
        # Fallback to local rules
        return [
            f"Increase roadside sweeping frequency in {req.ward}.",
            "Issue warnings to construction project managers regarding uncovered raw materials.",
            "Increase inspection frequency of local diesel generator installations.",
            "Encourage public transport utilization via municipal announcements.",
            "Ensure waste sorting compliance to stop open garbage incineration."
        ]

@app.get("/api/reports")
def get_pollution_reports(city: str = None):
    return db.get_reports(city)

@app.post("/api/reports")
def create_pollution_report(req: ReportRequest):
    timestamp = datetime.datetime.now().isoformat()
    # Simulated photo if blank
    photo = req.photo_url if req.photo_url else "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=300&q=80"
    report_id = db.add_report(
        city=req.city,
        lat=req.lat,
        lng=req.lng,
        category=req.category,
        description=req.description,
        photo_url=photo,
        timestamp=timestamp
    )
    return {"status": "success", "id": report_id}

@app.post("/api/dispatches")
def create_dispatch(req: DispatchRequest):
    dispatch_time = datetime.datetime.now().isoformat()
    dispatch_id = db.add_dispatch(
        report_id=req.report_id,
        ward_name=req.ward_name,
        inspector_name=req.inspector_name,
        action_taken=req.action_taken,
        dispatch_time=dispatch_time
    )
    return {"status": "success", "id": dispatch_id}

@app.post("/api/advisory")
def generate_health_advisory(req: AdvisoryRequest):
    language_map = {
        "English": "English",
        "Hindi": "Hindi (हिंदी)",
        "Telugu": "Telugu (తెలుగు)",
        "Tamil": "Tamil (தமிழ்)",
        "Kannada": "Kannada (ಕನ್ನಡ)"
    }
    
    target_lang = language_map.get(req.language, "English")
    
    if not gemini_client:
        # Mock responses for different languages
        mocks = {
            "English": "Air Quality is compromised. Wear N95 masks during commutes and keep windows shut. Elderly citizens should avoid active outdoor walks.",
            "Hindi": "वायु गुणवत्ता खराब है। आने-जाने के दौरान N95 मास्क पहनें और खिड़कियां बंद रखें। बुजुर्ग नागरिकों को बाहर टहलने से बचना चाहिए।",
            "Telugu": "గాలి నాణ్యత క్షీణించింది. ప్రయాణాల సమయంలో N95 మాస్కులు ధరించండి మరియు కిటికీలు మూసి ఉంచండి. వృద్ధులు బయట నడవకూడదు.",
            "Tamil": "காற்று தரம் மோசமடைந்துள்ளது. பயணத்தின் போது N95 முகமூடி அணியுங்கள். முதியவர்கள் வெளியே செல்வதைத் தவிர்க்கவும்.",
            "Kannada": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಕೆಟ್ಟದಾಗಿದೆ. ಪ್ರಯಾಣ ಮಾಡುವಾಗ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ ಮತ್ತು ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿ. ಹಿರಿಯ ನಾಗರಿಕರು ಹೊರಗೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಬೇಕು."
        }
        return {"advisory": mocks.get(req.language, mocks["English"])}
        
    prompt = f"""
    You are a public health official in India.
    Generate a health warning in {target_lang} for residents of {req.ward} in {req.city}.
    The current AQI is {req.aqi}.
    Provide:
    1. A clear warning message about the air quality level.
    2. Two direct, short actions residents must take (e.g. wear N95 mask, avoid outdoor jogging, protect children and elderly).
    3. Output the translation natively using the correct script.
    
    Keep the entire message short and concise (under 250 characters). Do not write labels or introductions. Just return the text in {target_lang}.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return {"advisory": response.text.strip()}
    except Exception as e:
        print("Gemini Advisory Error:", e)
        return {"advisory": f"Air quality is poor ({req.aqi}). Wear protection and limit outdoor exertion."}

# Serve React static build files
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Fallback to index.html for React Router
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Index not found")
else:
    print(f"Warning: Static files directory not found at {frontend_dist}. The frontend needs to be built first.")

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
