import { onRequest } from "firebase-functions/v2/https";

export const handleOAuthRedirect = onRequest((req, res) => {
  const { state, code } = req.query;
  res.redirect(`org.receiptsplitter.app://oauthredirect?state=${state}&code=${code}`);
});