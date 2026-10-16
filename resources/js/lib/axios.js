import axios from "axios";

const api = axios.create({
  baseURL: "/",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json",
  },
  withCredentials: true, 
});




export default api;