import apiClient from "./client";

async function signup(name, email, password){
    const response = await apiClient.post("/auth/signup", {
        name,
        email,
        password
    });
    return response.data;
}

async function login(email, password){
    const response = await apiClient.post("/auth/login", {
        email,
        password
    });
    return response.data;
}

export { login, signup };