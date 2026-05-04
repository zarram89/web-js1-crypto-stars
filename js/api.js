const BASE_URL = 'https://cryptostar.grading.htmlacademy.proщ';

const Endpoints = {
  USER: '/user',
  CONTRACTORS: '/contractors',
};

const checkResponse = (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getUser = async () => {
  try {
    const response = await fetch(`${BASE_URL}${Endpoints.USER}`);
    return await checkResponse(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const getContractors = async () => {
  try {
    const response = await fetch(`${BASE_URL}${Endpoints.CONTRACTORS}`);
    return await checkResponse(response);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    throw error;
  }
};

export const postExchange = async (data) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      body: data,
    });
    return await checkResponse(response);
  } catch (error) {
    console.error('Error posting exchange:', error);
    throw error;
  }
};
