import dotenv from 'dotenv'
dotenv.config();  //Loads its variables into process.env

const env={
    MONGOURL:process.env.MONGOURL||"mongodb://localhost:27017/quizzo_db",
    CORS_ORIGIN:process.env.CORS_ORIGIN||'http://localhost:5173',
    BACKEND_PORT: process.env.BACKEND_PORT || 4444,
}
export default env