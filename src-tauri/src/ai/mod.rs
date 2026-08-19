use crate::config::{AiProvider, ChatMessage, ChatRequest, ChatResponse, ModelListResponse};
use reqwest::Client;
use std::time::Duration;

pub struct AiClient {
    http: Client,
}

impl AiClient {
    pub fn new() -> Self {
        Self {
            http: Client::builder()
                .timeout(Duration::from_secs(120))
                .build()
                .unwrap(),
        }
    }

    async fn request_with_retry(
        &self,
        req: reqwest::RequestBuilder,
    ) -> Result<reqwest::Response, String> {
        let max_retries = 3;
        let mut last_err = String::new();

        for attempt in 0..max_retries {
            let resp = req
                .try_clone()
                .ok_or("Failed to clone request")?
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {e}"))?;

            if resp.status().as_u16() == 429 {
                let wait = 2u64.pow(attempt as u32);
                eprintln!("[BlenderCraft] Rate limited, retrying in {wait}s (attempt {}/{})", attempt + 1, max_retries);
                tokio::time::sleep(Duration::from_secs(wait)).await;
                last_err = format!("Rate limited by API provider (attempt {}/{})", attempt + 1, max_retries);
                continue;
            }

            return Ok(resp);
        }

        Err(format!("API rate limit: {last_err}. Try again in a few seconds or switch to a different provider."))
    }

    pub async fn send_chat(
        &self,
        provider: &AiProvider,
        messages: Vec<ChatMessage>,
        temperature: f32,
        max_tokens: u32,
    ) -> Result<String, String> {
        let url = format!("{}/chat/completions", provider.base_url.trim_end_matches('/'));

        let request = ChatRequest {
            model: provider.model_id.clone(),
            messages,
            temperature,
            max_tokens,
            stream: false,
        };

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        if !provider.api_key.is_empty() {
            let auth_value = format!("Bearer {}", provider.api_key);
            headers.insert(
                reqwest::header::AUTHORIZATION,
                auth_value.parse().unwrap(),
            );
        }

        let resp = self
            .request_with_retry(
                self.http.post(&url).headers(headers).json(&request),
            )
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {body}"));
        }

        let response: ChatResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {e}"))?;

        response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| "No response from AI".into())
    }

    pub async fn fetch_models(
        &self,
        provider: &AiProvider,
    ) -> Result<Vec<String>, String> {
        let url = format!("{}/models", provider.base_url.trim_end_matches('/'));

        let mut headers = reqwest::header::HeaderMap::new();
        if !provider.api_key.is_empty() {
            let auth_value = format!("Bearer {}", provider.api_key);
            headers.insert(
                reqwest::header::AUTHORIZATION,
                auth_value.parse().unwrap(),
            );
        }

        let resp = self
            .request_with_retry(self.http.get(&url).headers(headers))
            .await?;

        if !resp.status().is_success() {
            return Err(format!("Models endpoint returned {}", resp.status()));
        }

        let model_list: ModelListResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse model list: {e}"))?;

        Ok(model_list.data.into_iter().map(|m| m.id).collect())
    }

    pub async fn test_connection(
        &self,
        provider: &AiProvider,
    ) -> Result<String, String> {
        let test_messages = vec![ChatMessage {
            role: "user".into(),
            content: "Say 'connection successful' and nothing else.".into(),
        }];

        self.send_chat(provider, test_messages, 0.1, 50)
            .await
    }
}
