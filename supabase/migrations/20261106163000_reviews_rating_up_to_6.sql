-- Reviews can grade up to 6. The movie club uses 1-6 and the book club
-- 1-5; the app enforces each club's own maximum (club.maxRating in
-- src/club.ts), the database only the outer bounds shared by both.
alter table public.reviews drop constraint if exists reviews_rating_check;
alter table public.reviews
  add constraint reviews_rating_check check (rating between 1 and 6);
