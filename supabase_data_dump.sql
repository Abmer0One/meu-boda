--
-- PostgreSQL database dump
--



-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'fd460144-0de6-4456-9148-50861c793fe2', 'authenticated', 'authenticated', 'marinela@meuboda.co.ao', '$2a$10$l9u.Ep/OygzlkJ4yY.OoROy94eZZEfRZUoBVqGt6UnKQKz2yTOEJ2', '2026-06-28 12:31:30.546875+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-28 12:31:30.580856+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "fd460144-0de6-4456-9148-50861c793fe2", "email": "marinela@meuboda.co.ao", "email_verified": true, "phone_verified": false}', NULL, '2026-06-28 12:31:30.507412+00', '2026-06-28 12:31:30.604306+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'af07b9fa-7246-4d4f-9e94-cb519b915a87', 'authenticated', 'authenticated', 'abiud@meuboda.co.ao', '$2a$10$WYL84V7tD8hqEcA91WC9ROTDCNd.utlicW5kOaPbSKb7Z..kf4aIy', '2026-06-24 01:30:37.626996+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-28 12:46:46.050624+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "af07b9fa-7246-4d4f-9e94-cb519b915a87", "email": "abiud@meuboda.co.ao", "email_verified": true, "phone_verified": false}', NULL, '2026-06-24 01:30:37.593116+00', '2026-06-28 12:46:46.070871+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.identities VALUES ('af07b9fa-7246-4d4f-9e94-cb519b915a87', 'af07b9fa-7246-4d4f-9e94-cb519b915a87', '{"sub": "af07b9fa-7246-4d4f-9e94-cb519b915a87", "email": "abiud@meuboda.co.ao", "email_verified": false, "phone_verified": false}', 'email', '2026-06-24 01:30:37.613684+00', '2026-06-24 01:30:37.613782+00', '2026-06-24 01:30:37.613782+00', DEFAULT, 'aa0d9ff2-1743-4213-8fad-74a0aba18f35');
INSERT INTO auth.identities VALUES ('fd460144-0de6-4456-9148-50861c793fe2', 'fd460144-0de6-4456-9148-50861c793fe2', '{"sub": "fd460144-0de6-4456-9148-50861c793fe2", "email": "marinela@meuboda.co.ao", "email_verified": false, "phone_verified": false}', 'email', '2026-06-28 12:31:30.53462+00', '2026-06-28 12:31:30.53471+00', '2026-06-28 12:31:30.53471+00', DEFAULT, 'f31366fd-8782-408c-b464-820ed3c182f0');


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.events VALUES ('51399983-26a7-449f-be50-5b3516e97440', 'af07b9fa-7246-4d4f-9e94-cb519b915a87', 'Marinela e Abiud', 'marinela-e-abiud', 'Meu Boda', '2026-10-30 19:20:00+00', 'Centro Nossa Senhora da Paz', 'Eunice Capricho', 'Rústico', 'http://192.168.88.120:64325/storage/v1/object/public/invitations/51399983-26a7-449f-be50-5b3516e97440/convite_1782519496139.png', '2026-06-24 01:31:58.593938+00', '2026-06-27 00:18:16.708+00', 'casamento', '16:00', '-8.879680946621889, 13.253818498590988', '21:00', '-8.92424152091092, 13.26913931605989');


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.budgets VALUES ('0f0e631d-bdb2-40fe-99db-391f99bac510', '51399983-26a7-449f-be50-5b3516e97440', 'Salão', 1200000.00, 200000.00, '2026-06-24 02:23:56.606967+00');


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tables VALUES ('d96b03ce-e3c7-4711-8a7a-845aa66dec07', '51399983-26a7-449f-be50-5b3516e97440', 'Mesa Tropa H', 10, '2026-06-24 01:53:30.740118+00');
INSERT INTO public.tables VALUES ('39a8683c-fec8-4857-a07f-8e9d34ba5b66', '51399983-26a7-449f-be50-5b3516e97440', 'Mesa Faculdade', 10, '2026-06-24 22:20:36.312642+00');
INSERT INTO public.tables VALUES ('9cce57ad-ecf8-4969-88c5-8b9bb03ad4a0', '51399983-26a7-449f-be50-5b3516e97440', 'Familia da Noiva', 10, '2026-06-27 00:21:52.447468+00');


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.guests VALUES ('ca2d16fd-a749-49c0-9574-453e40874f03', '51399983-26a7-449f-be50-5b3516e97440', 'Abiud Mota', '+244 948824600', 'atommuther2@gmail.com', 'Familia Mota', 1, 'd96b03ce-e3c7-4711-8a7a-845aa66dec07', 'Confirmed', '0c301bdace2ced4ae2e15def29ffbe4a', true, 'venha fazer parte', '2026-06-24 01:38:33.171402+00');
INSERT INTO public.guests VALUES ('935700ce-b07b-4064-94fd-f1b337c4d20f', '51399983-26a7-449f-be50-5b3516e97440', 'Marinela Quitamba', '938669825', 'marinelaquitamba@gmail.com', 'Família', 1, NULL, 'Confirmed', '1f0c014c642fca737c73ee84ea6d4715', true, 'Gratidão Deus', '2026-06-27 00:17:28.873601+00');


--
-- Data for Name: checkins; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: event_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.event_media VALUES ('b0cad708-0a16-4a36-8dd8-76a3fd91e40c', '51399983-26a7-449f-be50-5b3516e97440', 'Abiud Mota', 'http://127.0.0.1:64321/storage/v1/object/public/event-galleries/51399983-26a7-449f-be50-5b3516e97440/1782383651260_98ijfgo.png', 'image', NULL, 'approved', '2026-06-25 10:34:15.217427+00');
INSERT INTO public.event_media VALUES ('beb36df6-634d-4317-bcad-99723e798bdc', '51399983-26a7-449f-be50-5b3516e97440', 'Marinela Quitamba', 'http://192.168.88.120:64325/storage/v1/object/public/event-galleries/51399983-26a7-449f-be50-5b3516e97440/1782520457526_olgctxv.png', 'image', NULL, 'approved', '2026-06-27 00:34:17.901794+00');


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tasks VALUES ('a91992db-f3e3-41b1-991c-b962ff045ef1', '51399983-26a7-449f-be50-5b3516e97440', 'Contratar Fotografo', 'pesquisar nas redes', '2026-06-30 00:00:00+00', 'Média', 'Pendente', '2026-06-24 01:49:50.862465+00');


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--



