import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

ratings_df = pd.read_csv('ml/ratings.csv')
movies_df = pd.read_csv('ml/movies.csv')

unique_user_id = ratings_df['userId'].unique()
user_mapping = {uid: i for i, uid in enumerate(unique_user_id)}
unique_movie_id = ratings_df['movieId'].unique()
movie_mapping = {mid: i for i, mid in enumerate(unique_movie_id)}

genres = movies_df['genres'].str.get_dummies('|')
movie_features = torch.from_numpy(genres.values).float()

user_indices = [user_mapping[uid] for uid in ratings_df['userId']]
movie_indices = [movie_mapping[mid] for mid in ratings_df['movieId']]
edge_index = torch.tensor([user_indices, movie_indices], dtype=torch.long)

print(f"Всего оценок: {len(ratings_df)}")
print(f"Пользователей: {len(user_mapping)}")
print(f"Фильмов: {len(movie_mapping)}")

class RegularizedRecommender(nn.Module):
    def __init__(self, num_users, num_movies, movie_features_dim, hidden_dim=64, dropout=0.2):
        super().__init__()
        
        self.user_embedding = nn.Embedding(num_users, hidden_dim)
        self.movie_embedding = nn.Embedding(num_movies, hidden_dim)
        
        self.movie_feature_layer = nn.Linear(movie_features_dim, hidden_dim)
        
        self.dropout = nn.Dropout(dropout)
        
        nn.init.normal_(self.user_embedding.weight, std=0.01)
        nn.init.normal_(self.movie_embedding.weight, std=0.01)
        
    def forward(self, user_ids, movie_ids, movie_features):
        user_emb = self.user_embedding(user_ids)
        movie_emb = self.movie_embedding(movie_ids) + self.movie_feature_layer(movie_features)
        
        if self.training:
            user_emb = self.dropout(user_emb)
            movie_emb = self.dropout(movie_emb)
        
        return (user_emb * movie_emb).sum(dim=-1)

def train_with_regularization(model, edge_index, movie_features, num_epochs=20, batch_size=1024, lr=0.01, weight_decay=1e-5):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    
    num_edges = edge_index.shape[1]
    indices = torch.randperm(num_edges)
    train_size = int(0.8 * num_edges)
    
    train_users = edge_index[0, indices[:train_size]]
    train_movies = edge_index[1, indices[:train_size]]
    val_users = edge_index[0, indices[train_size:]]
    val_movies = edge_index[1, indices[train_size:]]
    
    train_losses = []
    val_losses = []
    val_accs = []
    
    best_val_loss = float('inf')
    patience = 5
    patience_counter = 0
    best_model_state = None
    
    for epoch in range(num_epochs):
        model.train()
        total_train_loss = 0
        num_batches = 0
        
        for i in range(0, train_size, batch_size):
            batch_users = train_users[i:i+batch_size]
            batch_movies = train_movies[i:i+batch_size]
            
            pos_scores = model(batch_users, batch_movies, movie_features[batch_movies])
            pos_loss = F.binary_cross_entropy_with_logits(
                pos_scores, torch.ones_like(pos_scores)
            )
            
            neg_movies = torch.randint(0, len(movie_mapping), batch_users.shape)
            neg_scores = model(batch_users, neg_movies, movie_features[neg_movies])
            neg_loss = F.binary_cross_entropy_with_logits(neg_scores, torch.zeros_like(neg_scores))
            
            loss = pos_loss + neg_loss
            
            optimizer.zero_grad()
            loss.backward()
            
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            
            optimizer.step()
            
            total_train_loss += loss.item()
            num_batches += 1
        
        avg_train_loss = total_train_loss / num_batches
        train_losses.append(avg_train_loss)
        
        model.eval()
        total_val_loss = 0
        num_val_batches = 0
        correct = 0
        total = 0
        val_pos_scores = []
        val_neg_scores = []
        
        with torch.no_grad():
            for i in range(0, val_users.size(0), batch_size):
                batch_users = val_users[i:i+batch_size]
                batch_movies = val_movies[i:i+batch_size]
                
                pos_scores = model(batch_users, batch_movies, movie_features[batch_movies])
                pos_loss = F.binary_cross_entropy_with_logits(pos_scores, torch.ones_like(pos_scores))
                val_pos_scores.append(torch.sigmoid(pos_scores))
                
                neg_movies = torch.randint(0, len(movie_mapping), batch_users.shape)
                neg_scores = model(batch_users, neg_movies, movie_features[neg_movies])
                neg_loss = F.binary_cross_entropy_with_logits(
                    neg_scores, torch.zeros_like(neg_scores)
                )
                val_neg_scores.append(torch.sigmoid(neg_scores))
                
                loss = pos_loss + neg_loss
                total_val_loss += loss.item()
                num_val_batches += 1
                
                correct += (torch.sigmoid(pos_scores) > 0.5).sum().item()
                correct += (torch.sigmoid(neg_scores) < 0.5).sum().item()
                total += len(pos_scores) + len(neg_scores)
        
        avg_val_loss = total_val_loss / num_val_batches
        val_losses.append(avg_val_loss)
        accuracy = correct / total
        val_accs.append(accuracy)
        
        all_pos = torch.cat(val_pos_scores).numpy()
        all_neg = torch.cat(val_neg_scores).numpy()
        y_true = np.concatenate([np.ones_like(all_pos), np.zeros_like(all_neg)])
        y_score = np.concatenate([all_pos, all_neg])
        
        print(f"Epoch {epoch+1}: Train Loss = {avg_train_loss:.4f}, Val Loss = {avg_val_loss:.4f}, Val Acc = {accuracy:.4f}")
        
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            best_model_state = model.state_dict().copy()
            torch.save(model.state_dict(), 'best_model.pth')
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Ранняя остановка на эпохе {epoch+1}")
                break
    
    if best_model_state:
        model.load_state_dict(best_model_state)

    return model

#fix with real scores - (test: all watched filmes are preffered)
def recommend_for_user(model, user_id, user_mapping, movies_df, movie_mapping, movie_features, top_k=10, ratings_df=None):

    model.eval()

    #fix for new users? -retrain or find similar users
    if user_id not in user_mapping:
        print(f"Пользователь {user_id} не найден")
        return None
    
    user_idx = user_mapping[user_id]
    user_tensor = torch.tensor([user_idx])
    
    watched_movies = set()
    if ratings_df is not None:
        watched = ratings_df[ratings_df['userId'] == user_id]['movieId'].values
        watched_movies = set([movie_mapping.get(mid, -1) for mid in watched if mid in movie_mapping])
    
    all_movies = list(range(len(movie_mapping)))
    scores = []
    
    with torch.no_grad():
        for i in range(0, len(all_movies), 512):
            batch_movies = torch.tensor(all_movies[i:i+512])
            batch_users = user_tensor.repeat(len(batch_movies))
            batch_scores = torch.sigmoid(
                model(batch_users, batch_movies, movie_features[batch_movies])
            )
            scores.append(batch_scores.cpu())
    
    scores = torch.cat(scores)
    
    for idx in watched_movies:
        if 0 <= idx < len(scores):
            scores[idx] = -float('inf')
    
    top_scores, top_indices = torch.topk(scores, min(top_k, len(scores)))
    
    reverse_mapping = {v: k for k, v in movie_mapping.items()}
    recommended_ids = [reverse_mapping[idx.item()] for idx in top_indices]
    
    results = []
    for movie_id, score in zip(recommended_ids, top_scores):
        movie_info = movies_df[movies_df['movieId'] == movie_id].iloc[0]
        results.append({
            'movieId': movie_id,
            'title': movie_info['title'],
            'genres': movie_info['genres'],
            'score': score.item()
        })
    
    return pd.DataFrame(results)

def main():
    model = RegularizedRecommender(
        num_users=len(user_mapping),
        num_movies=len(movie_mapping),
        movie_features_dim=movie_features.shape[1],
        hidden_dim=64,
        dropout=0.3 
    )
    
    model = train_with_regularization(
        model, 
        edge_index, 
        movie_features, 
        num_epochs=20,
        batch_size=1024,
        lr=0.01,
        weight_decay=1e-4  
    )
    
    test_users = [1, 2, 5, 10, 100]
    
    for user_id in test_users:
        if user_id in user_mapping:
            print(f"\nРекомендации для пользователя {user_id}:\n")
            recommendations = recommend_for_user(
                model=model,
                user_id=user_id,
                user_mapping=user_mapping,
                movies_df=movies_df,
                movie_mapping=movie_mapping,
                movie_features=movie_features,
                top_k=5,
                ratings_df=ratings_df
            )
            
            if recommendations is not None:
                for _, row in recommendations.iterrows():
                    print(f"  {row['title']} - {row['score']:.3f}")

main()
