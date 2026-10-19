-- Un vídeo cuesta ~11× una foto en IA (Omni ≈ US$0,51–0,81 vs foto ≈ US$0,05).
-- Pasamos el vídeo de 4 a 10 créditos (solo si sigue en el valor original).
UPDATE public.credit_costs SET credits = 10, updated_at = timezone('utc', now())
WHERE action = 'video' AND credits = 4;
