--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backup_films; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_films (
    id integer,
    name character varying,
    type character varying,
    cost_per_sqft numeric(10,2),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.backup_films OWNER TO neondb_owner;

--
-- Name: backup_installer_time_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_installer_time_entries (
    id integer,
    job_entry_id integer,
    installer_id character varying,
    windows_completed integer,
    time_minutes integer,
    created_at timestamp without time zone
);


ALTER TABLE public.backup_installer_time_entries OWNER TO neondb_owner;

--
-- Name: backup_job_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_job_entries (
    id integer,
    date timestamp without time zone,
    vehicle_year character varying,
    vehicle_make character varying,
    vehicle_model character varying,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    window_installations jsonb,
    total_windows integer,
    window_assignments jsonb,
    job_number character varying,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration_minutes integer,
    film_id integer,
    total_sqft real,
    film_cost numeric(10,2)
);


ALTER TABLE public.backup_job_entries OWNER TO neondb_owner;

--
-- Name: backup_job_installers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_job_installers (
    id integer,
    job_entry_id integer,
    installer_id character varying,
    created_at timestamp without time zone,
    time_variance integer
);


ALTER TABLE public.backup_job_installers OWNER TO neondb_owner;

--
-- Name: backup_redo_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_redo_entries (
    id integer,
    job_entry_id integer,
    part character varying,
    "timestamp" timestamp without time zone,
    created_at timestamp without time zone,
    installer_id character varying,
    length_inches real,
    width_inches real,
    sqft real,
    material_cost numeric(10,2),
    time_minutes integer
);


ALTER TABLE public.backup_redo_entries OWNER TO neondb_owner;

--
-- Name: backup_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backup_users (
    id character varying,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.backup_users OWNER TO neondb_owner;

--
-- Name: film_inventory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.film_inventory (
    id integer NOT NULL,
    film_id integer NOT NULL,
    current_stock numeric(10,2) DEFAULT 0.00 NOT NULL,
    minimum_stock numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.film_inventory OWNER TO neondb_owner;

--
-- Name: film_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.film_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.film_inventory_id_seq OWNER TO neondb_owner;

--
-- Name: film_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.film_inventory_id_seq OWNED BY public.film_inventory.id;


--
-- Name: films; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.films (
    id integer NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL,
    cost_per_sqft numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.films OWNER TO neondb_owner;

--
-- Name: films_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.films_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.films_id_seq OWNER TO neondb_owner;

--
-- Name: films_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.films_id_seq OWNED BY public.films.id;


--
-- Name: installer_time_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.installer_time_entries (
    id integer NOT NULL,
    job_entry_id integer NOT NULL,
    installer_id character varying NOT NULL,
    windows_completed integer DEFAULT 0 NOT NULL,
    time_minutes integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.installer_time_entries OWNER TO neondb_owner;

--
-- Name: installer_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.installer_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.installer_time_entries_id_seq OWNER TO neondb_owner;

--
-- Name: installer_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.installer_time_entries_id_seq OWNED BY public.installer_time_entries.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    film_id integer NOT NULL,
    type character varying NOT NULL,
    quantity numeric(10,2) NOT NULL,
    previous_stock numeric(10,2) NOT NULL,
    new_stock numeric(10,2) NOT NULL,
    job_entry_id integer,
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_transactions OWNER TO neondb_owner;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: job_dimensions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_dimensions (
    id integer NOT NULL,
    job_entry_id integer NOT NULL,
    length_inches numeric(8,2) NOT NULL,
    width_inches numeric(8,2) NOT NULL,
    sqft numeric(10,4) NOT NULL,
    description character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.job_dimensions OWNER TO neondb_owner;

--
-- Name: job_dimensions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.job_dimensions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_dimensions_id_seq OWNER TO neondb_owner;

--
-- Name: job_dimensions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.job_dimensions_id_seq OWNED BY public.job_dimensions.id;


--
-- Name: job_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_entries (
    id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    vehicle_year character varying NOT NULL,
    vehicle_make character varying NOT NULL,
    vehicle_model character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    window_installations jsonb,
    total_windows integer DEFAULT 7 NOT NULL,
    window_assignments jsonb,
    job_number character varying,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration_minutes integer,
    film_id integer,
    total_sqft real,
    film_cost numeric(10,2)
);


ALTER TABLE public.job_entries OWNER TO neondb_owner;

--
-- Name: job_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.job_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_entries_id_seq OWNER TO neondb_owner;

--
-- Name: job_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.job_entries_id_seq OWNED BY public.job_entries.id;


--
-- Name: job_installers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_installers (
    id integer NOT NULL,
    job_entry_id integer NOT NULL,
    installer_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    time_variance integer NOT NULL
);


ALTER TABLE public.job_installers OWNER TO neondb_owner;

--
-- Name: job_installers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.job_installers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_installers_id_seq OWNER TO neondb_owner;

--
-- Name: job_installers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.job_installers_id_seq OWNED BY public.job_installers.id;


--
-- Name: redo_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.redo_entries (
    id integer NOT NULL,
    job_entry_id integer NOT NULL,
    part character varying NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    installer_id character varying NOT NULL,
    length_inches real,
    width_inches real,
    sqft real,
    material_cost numeric(10,2),
    time_minutes integer DEFAULT 0,
    film_id integer
);


ALTER TABLE public.redo_entries OWNER TO neondb_owner;

--
-- Name: redo_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.redo_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.redo_entries_id_seq OWNER TO neondb_owner;

--
-- Name: redo_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.redo_entries_id_seq OWNED BY public.redo_entries.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'installer'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    hourly_rate numeric(8,2) DEFAULT 0.00,
    password character varying
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: film_inventory id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.film_inventory ALTER COLUMN id SET DEFAULT nextval('public.film_inventory_id_seq'::regclass);


--
-- Name: films id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.films ALTER COLUMN id SET DEFAULT nextval('public.films_id_seq'::regclass);


--
-- Name: installer_time_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installer_time_entries ALTER COLUMN id SET DEFAULT nextval('public.installer_time_entries_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: job_dimensions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_dimensions ALTER COLUMN id SET DEFAULT nextval('public.job_dimensions_id_seq'::regclass);


--
-- Name: job_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_entries ALTER COLUMN id SET DEFAULT nextval('public.job_entries_id_seq'::regclass);


--
-- Name: job_installers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_installers ALTER COLUMN id SET DEFAULT nextval('public.job_installers_id_seq'::regclass);


--
-- Name: redo_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.redo_entries ALTER COLUMN id SET DEFAULT nextval('public.redo_entries_id_seq'::regclass);


--
-- Data for Name: backup_films; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_films (id, name, type, cost_per_sqft, is_active, created_at, updated_at) FROM stdin;
1	3M Ceramic 70%	Ceramic	8.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
2	3M Ceramic 50%	Ceramic	9.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
3	3M Ceramic 35%	Ceramic	9.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
4	3M Ceramic 20%	Ceramic	10.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
5	3M Carbon 70%	Carbon	7.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
6	3M Carbon 50%	Carbon	8.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
7	3M Carbon 35%	Carbon	8.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
8	3M Carbon 20%	Carbon	9.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
9	Standard Dyed 70%	Dyed	4.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
10	Standard Dyed 50%	Dyed	5.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
11	Standard Dyed 35%	Dyed	5.50	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
12	Standard Dyed 20%	Dyed	6.00	t	2025-06-12 01:49:44.521417	2025-06-12 01:49:44.521417
\.


--
-- Data for Name: backup_installer_time_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_installer_time_entries (id, job_entry_id, installer_id, windows_completed, time_minutes, created_at) FROM stdin;
17	36	JAY@TINTIX.COM	3	90	2025-06-14 00:52:36.31147
18	37	NN@GMAIL.COM	3	80	2025-06-14 00:54:00.123499
\.


--
-- Data for Name: backup_job_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_job_entries (id, date, vehicle_year, vehicle_make, vehicle_model, notes, created_at, updated_at, window_installations, total_windows, window_assignments, job_number, start_time, end_time, duration_minutes, film_id, total_sqft, film_cost) FROM stdin;
37	2025-06-12 00:00:00	2025	SDSD	SDSD		2025-06-14 00:54:00.044731	2025-06-14 00:54:00.044731	\N	3	"[{\\"windowId\\":\\"front_windshield\\",\\"installerId\\":\\"NN@GMAIL.COM\\",\\"windowName\\":\\"Front Windshield\\"},{\\"windowId\\":\\"front_driver\\",\\"installerId\\":\\"NN@GMAIL.COM\\",\\"windowName\\":\\"Front Driver\\"},{\\"windowId\\":\\"front_passenger\\",\\"installerId\\":\\"NN@GMAIL.COM\\",\\"windowName\\":\\"Front Passenger\\"}]"	JOB-2	\N	\N	80	10	10	100.00
36	2025-06-13 00:00:00	2025	SSS	SSS		2025-06-14 00:52:36.204725	2025-06-14 00:52:36.204725	\N	3	"[{\\"windowId\\":\\"front_windshield\\",\\"installerId\\":\\"JAY@TINTIX.COM\\",\\"windowName\\":\\"Front Windshield\\"},{\\"windowId\\":\\"front_driver\\",\\"installerId\\":\\"JAY@TINTIX.COM\\",\\"windowName\\":\\"Front Driver\\"},{\\"windowId\\":\\"front_passenger\\",\\"installerId\\":\\"JAY@TINTIX.COM\\",\\"windowName\\":\\"Front Passenger\\"}]"	JOB-1	\N	\N	90	12	20	180.00
\.


--
-- Data for Name: backup_job_installers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_job_installers (id, job_entry_id, installer_id, created_at, time_variance) FROM stdin;
73	36	JAY@TINTIX.COM	2025-06-14 00:52:36.290568	0
74	37	NN@GMAIL.COM	2025-06-14 00:54:00.10494	0
\.


--
-- Data for Name: backup_redo_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_redo_entries (id, job_entry_id, part, "timestamp", created_at, installer_id, length_inches, width_inches, sqft, material_cost, time_minutes) FROM stdin;
60	36	windshield	2025-06-14 00:52:36.321	2025-06-14 00:52:36.331679	JAY@TINTIX.COM	36	40	10	\N	30
61	37	windshield	2025-06-14 00:54:00.133	2025-06-14 00:54:00.141728	NN@GMAIL.COM	36	40	10	\N	20
\.


--
-- Data for Name: backup_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.backup_users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at) FROM stdin;
OSAMA@GMAIL.COM	OSAMA@GMAIL.COM	OSAMA	MASWADEH	\N	installer	2025-06-03 23:33:46.325244	2025-06-03 23:33:46.325244
NN@GMAIL.COM	NN@GMAIL.COM	NABEEL	FARAJ	\N	installer	2025-06-03 23:33:54.476102	2025-06-03 23:33:54.476102
JAY@TINTIX.COM	JAY@TINTIX.COM	JALEN	BROWN	\N	installer	2025-06-03 23:38:17.039853	2025-06-03 23:38:17.039853
TK@GMAIL.COM	TK@GMAIL.COM	FABIAN 	MARTINEZ	\N	manager	2025-06-03 23:33:38.070053	2025-06-04 16:29:27.2
39731218	info@tintix.com	sdsd	sdsd	\N	manager	2025-06-03 20:58:09.533217	2025-06-10 00:29:49.92
\.


--
-- Data for Name: film_inventory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.film_inventory (id, film_id, current_stock, minimum_stock, created_at, updated_at) FROM stdin;
4	16	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
5	17	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
6	18	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
7	19	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
8	20	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
9	21	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
11	23	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
12	24	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
13	25	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
14	26	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
15	27	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
17	29	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
18	30	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
19	31	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
20	32	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
22	34	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
23	35	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
10	22	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
2	14	251.50	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:35:49.710652
1	13	98.33	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
3	15	63.33	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
16	28	20.83	50.00	2025-06-14 22:33:14.518674	2025-06-14 22:33:14.518674
21	33	0.00	50.00	2025-06-14 22:33:14.518674	2025-06-15 17:23:25.406
\.


--
-- Data for Name: films; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.films (id, name, type, cost_per_sqft, is_active, created_at, updated_at) FROM stdin;
13	36" XR+ %5	Ceramic	2.51	t	2025-06-14 21:59:22.777574	2025-06-14 21:59:22.777574
14	36" XR+ %20	Ceramic	2.51	t	2025-06-14 21:59:50.185901	2025-06-14 21:59:50.185901
15	36" XR+ %30	Ceramic	2.51	t	2025-06-14 22:00:02.459245	2025-06-14 22:00:02.459245
16	36" XR+ %45	Ceramic	2.51	t	2025-06-14 22:00:15.155504	2025-06-14 22:00:15.155504
17	36" XR+ %70	Ceramic	2.51	t	2025-06-14 22:01:32.182541	2025-06-14 22:01:32.182541
18	36" XR %5	Ceramic	1.50	t	2025-06-14 22:01:54.103807	2025-06-14 22:01:54.103807
19	36" XR %20	Ceramic	1.50	t	2025-06-14 22:02:03.291206	2025-06-14 22:02:03.291206
20	36" XR %30	Ceramic	1.50	t	2025-06-14 22:02:12.049694	2025-06-14 22:02:12.049694
21	36" XR %45	Ceramic	1.50	t	2025-06-14 22:02:37.376053	2025-06-14 22:02:37.376053
22	40" XR %45	Ceramic	1.50	t	2025-06-14 22:03:57.680782	2025-06-14 22:03:57.680782
23	40" XR %70	Ceramic	1.50	t	2025-06-14 22:04:24.989617	2025-06-14 22:04:24.989617
24	60" XR %5	Ceramic	1.50	t	2025-06-14 22:04:55.770787	2025-06-14 22:04:55.770787
25	60" XR %20	Ceramic	1.50	t	2025-06-14 22:05:14.776104	2025-06-14 22:05:14.776104
26	60" XR %30	Ceramic	1.50	t	2025-06-14 22:05:24.193585	2025-06-14 22:05:24.193585
27	60" XR %70	Ceramic	1.50	t	2025-06-14 22:05:40.213648	2025-06-14 22:05:40.213648
28	36" HP %5	Hybrid	0.75	t	2025-06-14 22:07:11.194813	2025-06-14 22:07:11.194813
29	36" HP %20	Hybrid	0.75	t	2025-06-14 22:07:27.306241	2025-06-14 22:07:27.306241
30	36" HP %35	Hybrid	0.75	t	2025-06-14 22:07:37.40776	2025-06-14 22:07:37.40776
31	36" HP %50	Hybrid	0.75	t	2025-06-14 22:07:57.434939	2025-06-14 22:07:57.434939
32	"40 LX %5	Carbon	0.42	t	2025-06-14 22:09:22.102894	2025-06-14 22:09:22.102894
33	"40 LX %20	Carbon	0.42	t	2025-06-14 22:09:38.299976	2025-06-14 22:09:38.299976
34	"40 LX %35	Carbon	0.42	t	2025-06-14 22:09:55.266508	2025-06-14 22:09:55.266508
35	"40 LX %50	Carbon	0.42	t	2025-06-14 22:10:12.68889	2025-06-14 22:10:12.68889
\.


--
-- Data for Name: installer_time_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.installer_time_entries (id, job_entry_id, installer_id, windows_completed, time_minutes, created_at) FROM stdin;
23	44	test_installer_1	4	80	2025-06-15 17:23:25.375183
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_transactions (id, film_id, type, quantity, previous_stock, new_stock, job_entry_id, notes, created_by, created_at) FROM stdin;
1	14	deduction	-15.50	100.00	84.50	40	Auto-deduction for job JOB-TEST-001	39731218	2025-06-14 22:34:58.416537
2	14	deduction	-30.00	84.50	54.50	41	Auto-deduction for job JOB-TEST-002	39731218	2025-06-14 22:35:42.628558
3	14	addition	200.00	54.50	254.50	\N	New stock shipment received - restocking 36" XR+ %20	39731218	2025-06-14 22:35:49.710652
4	33	deduction	-30.00	0.00	0.00	44	Auto-deduction for job JOB-5	test_installer_1	2025-06-15 17:23:25.431706
\.


--
-- Data for Name: job_dimensions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.job_dimensions (id, job_entry_id, length_inches, width_inches, sqft, description, created_at) FROM stdin;
15	43	24.00	18.00	3.0000	Front windshield - XR+ 20%	2025-06-15 01:15:18.827152
16	43	20.00	12.00	1.6700	Side window left - XR+ 5%	2025-06-15 01:15:18.827152
17	43	20.00	12.00	1.6700	Side window right - XR+ 30%	2025-06-15 01:15:18.827152
18	43	30.00	20.00	4.1700	Rear windshield - HP 5%	2025-06-15 01:15:18.827152
19	44	36.00	40.00	10.0000	front w.s 	2025-06-15 17:23:25.296202
20	44	36.00	40.00	10.0000	back w.s	2025-06-15 17:23:25.318976
\.


--
-- Data for Name: job_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.job_entries (id, date, vehicle_year, vehicle_make, vehicle_model, notes, created_at, updated_at, window_installations, total_windows, window_assignments, job_number, start_time, end_time, duration_minutes, film_id, total_sqft, film_cost) FROM stdin;
40	2025-06-14 22:34:44.697368	2023	Tesla	Model 3	Test job to demonstrate inventory auto-deduction	2025-06-14 22:34:44.697368	2025-06-14 22:34:44.697368	\N	7	\N	JOB-TEST-001	\N	\N	120	14	15.5	62.00
41	2025-06-14 22:35:18.339814	2022	BMW	X5	Second test job - will trigger low stock alert	2025-06-14 22:35:18.339814	2025-06-14 22:35:18.339814	\N	7	\N	JOB-TEST-002	\N	\N	90	14	30	120.00
42	2025-06-14 00:00:00	2023	Honda	Civic	Test job to verify inventory deduction system	2025-06-14 23:35:32.481904	2025-06-14 23:35:32.481904	\N	4	\N	INVENTORY-TEST-001	\N	\N	\N	14	25	\N
43	2025-06-15 00:00:00	2024	BMW	X5	Test job with multiple film types per dimension	2025-06-15 01:15:00.182386	2025-06-15 01:15:00.182386	\N	4	\N	MULTI-FILM-TEST-001	\N	\N	\N	\N	\N	\N
44	2025-06-15 00:00:00	2025 	toyota	camry	sadsadasd	2025-06-15 17:23:25.26151	2025-06-15 17:23:25.26151	\N	4	"[{\\"windowId\\":\\"front_windshield\\",\\"installerId\\":\\"test_installer_1\\",\\"windowName\\":\\"Front Windshield\\"},{\\"windowId\\":\\"front_driver\\",\\"installerId\\":\\"test_installer_1\\",\\"windowName\\":\\"Front Driver\\"},{\\"windowId\\":\\"front_passenger\\",\\"installerId\\":\\"test_installer_1\\",\\"windowName\\":\\"Front Passenger\\"},{\\"windowId\\":\\"custom_1750008043770\\",\\"installerId\\":\\"test_installer_1\\",\\"windowName\\":\\"Custom Window 1\\"}]"	JOB-5	\N	\N	80	33	20	12.60
\.


--
-- Data for Name: job_installers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.job_installers (id, job_entry_id, installer_id, created_at, time_variance) FROM stdin;
79	40	test_installer_1	2025-06-14 22:34:50.316414	0
80	44	test_installer_1	2025-06-15 17:23:25.353791	-1
\.


--
-- Data for Name: redo_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.redo_entries (id, job_entry_id, part, "timestamp", created_at, installer_id, length_inches, width_inches, sqft, material_cost, time_minutes, film_id) FROM stdin;
64	44	windshield	2025-06-15 17:23:25.444	2025-06-15 17:23:25.452916	test_installer_1	36	40	10	\N	19	\N
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
O0GxXSKDnr84bJwkU4yd6AWtO1cybHHN	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:35:57.019Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"local_1750008956944_si6wvodjs"}}	2025-06-16 17:35:58
bIJd98mNu682frtxXwS2lUYpg4ysKAZB	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:36:27.321Z","secure":false,"httpOnly":true,"path":"/"}}	2025-06-16 17:36:28
eC89i3IPmAogpALBpsuSg8gYM91LPkGy	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:39:29.263Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"39731218"}}	2025-06-16 17:39:30
8uaLjgp0HratYZQsKaa6qhIl0vOsU5Or	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:42:38.440Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"local_1750009358375_qzj1km7ry"}}	2025-06-16 17:42:39
ftYWC_srJ4R2ECGPDGfe0f2-tuh-_XqK	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:42:50.012Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"local_1750009369958_g3m4kvbgv"}}	2025-06-16 17:42:51
naCFkhBhy-VdudcjlDObtPSoJDLaRCtw	{"cookie":{"originalMaxAge":86400000,"expires":"2025-06-16T17:39:32.788Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"39731218"}}	2025-06-16 17:54:15
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
asYMkNP__nt45AsfyCujPbnzyBpASa_q	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-16T03:23:59.779Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "7175c1df-2659-4b7e-b037-19fa6ba4bcc3", "exp": 1749443039, "iat": 1749439439, "iss": "https://replit.com/oidc", "sub": "39731218", "email": "info@tintix.com", "at_hash": "k9Wl1lfoNUmKbpidXx-b1A", "username": "info4013", "auth_time": 1748986105, "last_name": "sdsd", "first_name": "sdsd"}, "expires_at": 1749443039, "access_token": "e5eBEokSxpY0XEkSNLDhh2LEhRTfoIjpwXnyp75MlPj", "refresh_token": "1svPtZlEEIh6YVx2BiD7-H-KDNqTHcm_wlqAWC8WIuT"}}}	2025-06-16 03:24:00
MTbDSH3e_eJOpZrVqKIj34eUWZVlMM5i	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-22T16:42:02.272Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "7175c1df-2659-4b7e-b037-19fa6ba4bcc3", "exp": 1750009322, "iat": 1750005722, "iss": "https://replit.com/oidc", "sub": "39731218", "email": "info@tintix.com", "at_hash": "vJu3DXhsC_oOhyz6SPEVxg", "username": "info4013", "auth_time": 1749953317, "last_name": "sdsd", "first_name": "sdsd"}, "expires_at": 1750009322, "access_token": "Z2_b2EitKayS6_pKbWXaFPm5y2WzGbVmy2QJrbmKfZV", "refresh_token": "hCYDmN6Xi8WqIksl1Yg9VfioZVfE00EqK5L1x7lOi55"}}}	2025-06-22 17:32:25
PLHU_20GScvbg8vT3aSYY6QRB-3-NUd6	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-22T00:39:19.352Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "7175c1df-2659-4b7e-b037-19fa6ba4bcc3", "exp": 1749951559, "iat": 1749947959, "iss": "https://replit.com/oidc", "sub": "39731218", "email": "info@tintix.com", "at_hash": "idLvk6OwnnL8_gYq1pCmAw", "username": "info4013", "auth_time": 1749947958, "last_name": "sdsd", "first_name": "sdsd"}, "expires_at": 1749951559, "access_token": "S1n1at2mjzWbBLyhd1lOqZ7FDJ0J5-q7r-_q19R-6cZ", "refresh_token": "-R0Bw1amU_do-bl5FYCvXb_OLHDxO-yrypptB_y_5wS"}}}	2025-06-22 01:30:21
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at, hourly_rate, password) FROM stdin;
test_installer_1	installer@test.com	John	Smith	\N	installer	2025-06-14 22:34:30.973015	2025-06-14 22:34:30.973015	25.00	\N
local_1750008903309_x61ndka4u	test@example.com	John	Doe	\N	installer	2025-06-15 17:35:03.320812	2025-06-15 17:35:03.320812	25.00	e8706011e6c544a452b289944d70f6da295491ccb5087e4f86408bfbf3ef6946a34db7459ce23f52b1e6fc123ba057d98d21100a85ee24cbb7e8b9374e6a6a38.f1fdfe55decd01f53261d39e14293431
local_1750008933531_59bdw143d	newuser@example.com	Jane	Smith	\N	installer	2025-06-15 17:35:33.543589	2025-06-15 17:35:33.543589	25.00	c90a19998b0b8ab41ab066149e642afd9e1b08975c300db4cf9dac2cf89c53697d48b4f3eca7bac22795c367e0bb6878d3e4cf4281362f160d96599109a2983a.1540c4e98d0a69e17d58a170c9c49bdb
local_1750008956944_si6wvodjs	testuser1750008956@example.com	Jane	Smith	\N	installer	2025-06-15 17:35:56.95645	2025-06-15 17:35:56.95645	25.00	0658a88d3850bce0168269d99825187def18ae0c799529247fc468ccf1a2275a2e42d9cc2c2f0b0ce562509a05b26fb2f36ca05620249fdf495989890999395c.21fa33a4479dcc37ed3e32e51c120e55
39731218	info@tintix.com	sdsd	sdsd	\N	manager	2025-06-03 20:58:09.533217	2025-06-15 02:08:37.305	0.00	4bce0c3d5a0811cb1befc2a743f710269799f1a24423e0547e2e4248eed1c5099e7410de493dd6d829c0cdebccfb498338c15128328537047bc9068def346cef.da0fbaa041a5ea29dcac5851a7ab2f71
local_1750009358375_qzj1km7ry	testdataentry1750009358@example.com	Test	User	\N	installer	2025-06-15 17:42:38.386528	2025-06-15 17:42:38.386528	25.00	79957866b35fd47a7c57fda4e95899f3358966358f20a4f81e0fd8a8ced1ff9766ad0caa7bd9680b6c21d17bd5982c1d057a16515ba82bec4d3b4a8d2f3b4dbe.961ca450c4d5bbdeb6528ed58695e6a5
local_1750009369958_g3m4kvbgv	testdataentry1750009369@example.com	Test	User	\N	data_entry	2025-06-15 17:42:49.967751	2025-06-15 17:42:49.967751	25.00	72bdaeb7a0e18a20dfc5858243221d96bc93a45ad27a201e7baf7b1a61d265bc6ee3e2dbdb3322ca7221cd35b176c929cd6d93c9475d3508181605fc45285f62.cd739dbd61fc22aad7daf678a19a4533
\.


--
-- Name: film_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.film_inventory_id_seq', 23, true);


--
-- Name: films_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.films_id_seq', 35, true);


--
-- Name: installer_time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.installer_time_entries_id_seq', 23, true);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 4, true);


--
-- Name: job_dimensions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.job_dimensions_id_seq', 20, true);


--
-- Name: job_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.job_entries_id_seq', 44, true);


--
-- Name: job_installers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.job_installers_id_seq', 80, true);


--
-- Name: redo_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.redo_entries_id_seq', 64, true);


--
-- Name: film_inventory film_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.film_inventory
    ADD CONSTRAINT film_inventory_pkey PRIMARY KEY (id);


--
-- Name: films films_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.films
    ADD CONSTRAINT films_name_key UNIQUE (name);


--
-- Name: films films_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.films
    ADD CONSTRAINT films_pkey PRIMARY KEY (id);


--
-- Name: installer_time_entries installer_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installer_time_entries
    ADD CONSTRAINT installer_time_entries_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: job_dimensions job_dimensions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_dimensions
    ADD CONSTRAINT job_dimensions_pkey PRIMARY KEY (id);


--
-- Name: job_entries job_entries_job_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_entries
    ADD CONSTRAINT job_entries_job_number_key UNIQUE (job_number);


--
-- Name: job_entries job_entries_job_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_entries
    ADD CONSTRAINT job_entries_job_number_unique UNIQUE (job_number);


--
-- Name: job_entries job_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_entries
    ADD CONSTRAINT job_entries_pkey PRIMARY KEY (id);


--
-- Name: job_installers job_installers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_installers
    ADD CONSTRAINT job_installers_pkey PRIMARY KEY (id);


--
-- Name: redo_entries redo_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.redo_entries
    ADD CONSTRAINT redo_entries_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: film_inventory film_inventory_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.film_inventory
    ADD CONSTRAINT film_inventory_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.films(id) ON DELETE CASCADE;


--
-- Name: installer_time_entries installer_time_entries_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installer_time_entries
    ADD CONSTRAINT installer_time_entries_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: installer_time_entries installer_time_entries_job_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installer_time_entries
    ADD CONSTRAINT installer_time_entries_job_entry_id_fkey FOREIGN KEY (job_entry_id) REFERENCES public.job_entries(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_transactions inventory_transactions_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.films(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_job_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_job_entry_id_fkey FOREIGN KEY (job_entry_id) REFERENCES public.job_entries(id);


--
-- Name: job_dimensions job_dimensions_job_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_dimensions
    ADD CONSTRAINT job_dimensions_job_entry_id_fkey FOREIGN KEY (job_entry_id) REFERENCES public.job_entries(id) ON DELETE CASCADE;


--
-- Name: job_entries job_entries_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_entries
    ADD CONSTRAINT job_entries_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.films(id);


--
-- Name: job_installers job_installers_installer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_installers
    ADD CONSTRAINT job_installers_installer_id_users_id_fk FOREIGN KEY (installer_id) REFERENCES public.users(id);


--
-- Name: job_installers job_installers_job_entry_id_job_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_installers
    ADD CONSTRAINT job_installers_job_entry_id_job_entries_id_fk FOREIGN KEY (job_entry_id) REFERENCES public.job_entries(id) ON DELETE CASCADE;


--
-- Name: redo_entries redo_entries_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.redo_entries
    ADD CONSTRAINT redo_entries_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.films(id);


--
-- Name: redo_entries redo_entries_installer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.redo_entries
    ADD CONSTRAINT redo_entries_installer_id_users_id_fk FOREIGN KEY (installer_id) REFERENCES public.users(id);


--
-- Name: redo_entries redo_entries_job_entry_id_job_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.redo_entries
    ADD CONSTRAINT redo_entries_job_entry_id_job_entries_id_fk FOREIGN KEY (job_entry_id) REFERENCES public.job_entries(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

