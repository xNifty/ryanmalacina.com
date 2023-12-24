function handleResponse(res, message, status) {
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify({ [status]: message, status }));
}

export default handleResponse;
