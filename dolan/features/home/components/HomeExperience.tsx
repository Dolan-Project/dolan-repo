"use client";
import { FormEvent,useEffect,useRef,useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";
import { findProvince, searchProvinces } from "@/lib/provinces";
import type { GuestHomePayload } from "../load-guest-home";
import { isLiveGuestHome } from "../load-guest-home";
import { GlobeCanvas } from "./GlobeCanvas";
import styles from "./home.module.css";

const travelerMessages=["Ada yang ke Labuan Bajo?","Cari teman sunrise-an ☀️","Yuk susun trip bareng!"];
const demoSteps=[
 {icon:"search",title:"Temukan tujuan",copy:"Cari kota, destinasi, atau trip publik yang waktunya cocok.",label:"Cari petualangan"},
 {icon:"route",title:"Susun itinerary",copy:"Atur budget dan biarkan AI menyusun urutan perjalanan yang efisien.",label:"Dolan AI bekerja"},
 {icon:"groups",title:"Kenalan & berangkat",copy:"Cek profil, berdiskusi, lalu ajukan join ke trip yang kamu percaya.",label:"Teman ditemukan"},
] as const;
const faqs=[
 ["Apakah join trip di Dolan berbayar?","Tidak. Setiap peserta membayar kebutuhan perjalanannya sendiri dan tidak membayar biaya join kepada host."],
 ["Bagaimana memastikan teman perjalanan dapat dipercaya?","Lihat profil, riwayat trip, koneksi, dan rating dari peserta trip sebelumnya. Kamu juga bisa berdiskusi sebelum mengajukan join."],
 ["Apakah itinerary dari AI bisa diedit?","Bisa. Destinasi, urutan rute, jadwal, dan estimasi budget dapat disesuaikan sebelum disimpan ke Trip Saya."],
 ["Dari mana data destinasi dan rute berasal?","Data tempat dan foto berasal dari Google Places (dengan cache foto di Dolan). Rencana trip, chat, dan komunitas disimpan di database Dolan."],
 ["Bisakah trip dibuat private?","Bisa. Trip private hanya terlihat oleh pemilik dan anggota yang diundang. Trip public dapat ditemukan dan dikomentari traveler lain."],
] as const;
const unsplash={
 bromo:"https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1600&q=88",
 bali:"https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=88",
 ijen:"https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1600&q=88",
 komodo:"https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=1600&q=88",
} as const;
const mockDestinations=[
 {name:"Bromo & Semeru",meta:"Jawa Timur · Jeep & Sunrise",image:unsplash.bromo,size:"large" as const,href:ROUTES.jelajah},
 {name:"Nusa Penida",meta:"Bali · Tebing & Snorkeling",image:unsplash.bali,size:"tall" as const,href:ROUTES.jelajah},
 {name:"Kawah Ijen",meta:"Banyuwangi · Blue Fire",image:unsplash.ijen,size:"small" as const,href:ROUTES.jelajah},
 {name:"Kepulauan Komodo",meta:"NTT · Sailing & Island Hopping",image:unsplash.komodo,size:"small" as const,href:ROUTES.jelajah},
];
const mockPublicTrips=[
 {id:"demo-1",title:"Pendakian Rinjani 3H2M via Sembalun",place:"Lombok, NTB",date:"18–20 Oktober",seats:3,host:"Wayan",image:unsplash.bromo,avatar:ASSETS.hostWayan},
 {id:"demo-2",title:"Roadtrip Pesisir Jogja & Pacitan",place:"Yogyakarta",date:"25–27 Oktober",seats:2,host:"Sinta",image:unsplash.ijen,avatar:ASSETS.hostSinta},
 {id:"demo-3",title:"Sailing Komodo 3H2M",place:"Labuan Bajo, NTT",date:"1–3 November",seats:4,host:"Dimas",image:unsplash.komodo,avatar:ASSETS.profile},
];

type HomeExperienceProps = { live?: GuestHomePayload | null };

export function HomeExperience({ live = null }: HomeExperienceProps){
 const useLive=isLiveGuestHome();
 const destinations=useLive?(live?.destinations??[]):mockDestinations;
 const publicTrips=useLive?(live?.trips??[]):mockPublicTrips;
 const feedError=useLive?live?.loadError??null:null;
 const router=useRouter();
 const[city,setCity]=useState("");
 const[phase,setPhase]=useState<"idle"|"searching"|"reveal">("idle");
 const[messageIndex,setMessageIndex]=useState(0);
 const[messagesVisible,setMessagesVisible]=useState(true);
 const[demoStep,setDemoStep]=useState(0);
 const[error,setError]=useState("");
 const dialogRef=useRef<HTMLDivElement>(null),searchButtonRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let hideTimer=0,nextTimer=0;const cycle=()=>{setMessagesVisible(true);hideTimer=window.setTimeout(()=>setMessagesVisible(false),5500);nextTimer=window.setTimeout(()=>{setMessageIndex(i=>(i+1)%travelerMessages.length);cycle()},11500)};cycle();return()=>{window.clearTimeout(hideTimer);window.clearTimeout(nextTimer)}},[]);
 useEffect(()=>{const timer=window.setInterval(()=>setDemoStep(i=>(i+1)%demoSteps.length),4200);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{if(!error)return;document.body.style.overflow="hidden";dialogRef.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){closeError();return;}if(e.key!=="Tab"||!dialogRef.current)return;const focusable=[...dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!focusable.length){e.preventDefault();dialogRef.current.focus();return;}const first=focusable[0],last=focusable.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};window.addEventListener("keydown",key);return()=>{document.body.style.overflow="";window.removeEventListener("keydown",key);};},[error]);
 function closeError(){setError("");setPhase("idle");requestAnimationFrame(()=>searchButtonRef.current?.focus());}
 const provinceMatches=searchProvinces(city);
 function goToProvince(slug:string){router.push(ROUTES.province(slug));}
 function runSearch(){
  const matched=findProvince(city);
  if(matched){goToProvince(matched.slug);return;}
  const suggestions=searchProvinces(city);
  if(suggestions[0]){goToProvince(suggestions[0].slug);return;}
  setError("Provinsi tidak ditemukan. Coba ketik nama seperti Bali, Jawa Timur, atau Nusa Tenggara Timur.");
  setPhase("idle");
 }
 function submitSearch(e:FormEvent){e.preventDefault();runSearch();}
 return <>
 <section className={styles.hero}><div className={styles.ambient}/><div className={styles.clouds} aria-hidden="true"><i/><i/><i/><i/></div><svg className={styles.flightScene} viewBox="0 0 1440 720" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="planeColor" x1="0" x2="1"><stop stopColor="#ff9d58"/><stop offset="1" stopColor="#ff6f1d"/></linearGradient></defs><path className={styles.flightPath} d="M1380 485 C1160 280 920 245 690 335 S470 505 315 430"/><g className={styles.routeDestination} transform="translate(315 430)"><path d="M0-22a16 16 0 0 0-16 16C-16 7 0 25 0 25S16 7 16-6A16 16 0 0 0 0-22Z"/><circle cy="-6" r="6"/></g><g className={styles.flightPlane}><image href="/images/dolan-plane-realistic.png" x="-62" y="-42" width="124" height="84" transform="rotate(180)" preserveAspectRatio="xMidYMid meet"/><animateMotion dur="12s" repeatCount="indefinite" rotate="auto" path="M1380 485 C1160 280 920 245 690 335 S470 505 315 430"/></g></svg><div className={styles.globeStage} aria-hidden="true"><div className={`${styles.globeWrap} ${styles[phase]}`}><GlobeCanvas fast={phase==="searching"}/></div></div><div className={`${styles.heroPost} ${styles.postOne}`} style={{position:"absolute"}}><Image src={unsplash.bali} alt="Nusa Penida" fill unoptimized sizes="180px"/><span>Bali</span></div><div className={`${styles.heroPost} ${styles.postTwo}`} style={{position:"absolute"}}><Image src={unsplash.komodo} alt="Labuan Bajo" fill unoptimized sizes="180px"/><span>Labuan Bajo</span></div><div className={`${styles.socialBubble} ${styles.socialOne}`}><span style={{position:"relative"}}><Image src={ASSETS.hostWayan} alt="Wayan, traveler Dolan" fill unoptimized sizes="58px"/></span>{messagesVisible&&<p key={`one-${messageIndex}`}>{travelerMessages[messageIndex]}</p>}</div><div className={`${styles.socialBubble} ${styles.socialTwo}`}><span style={{position:"relative"}}><Image src={ASSETS.hostSinta} alt="Sinta, traveler Dolan" fill unoptimized sizes="58px"/></span>{messagesVisible&&<p key={`two-${messageIndex}`}>{travelerMessages[(messageIndex+1)%travelerMessages.length]}</p>}</div>
  <div className={styles.heroInner}><div className={styles.heroCopy}><span className={styles.kicker}>Dolan bareng, cerita bareng</span><h1>Tujuannya sama.<br/><em>Ceritanya bisa bersama.</em></h1>
  <p>Temukan destinasi, susun itinerary sesuai budget, lalu berangkat bersama traveler yang punya rencana serupa.</p>
  <form onSubmit={submitSearch} className={`${styles.searchPanel} ${styles.destinationOnlySearch}`} aria-label="Cari provinsi"><label className={styles.field}><span><Icon name="map"/> Provinsi tujuan</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Cari provinsi, mis. Bali atau Jawa Timur" autoComplete="off" aria-autocomplete="list" aria-controls="province-suggestions"/>{provinceMatches.length>0&&<div id="province-suggestions" className={styles.provinceSuggestions} role="listbox">{provinceMatches.map(province=><button type="button" role="option" key={province.slug} onClick={()=>goToProvince(province.slug)}><Icon name="map"/><span><b>{province.name}</b><small>Provinsi · ibu kota {province.capital}</small></span></button>)}</div>}</label><button ref={searchButtonRef} type="submit" className={styles.searchButton}><Icon name="explore"/><span>Cari provinsi</span></button></form>
  </div></div>
 </section>

 <section className={`${styles.section} ${styles.destinations}`}><SectionHeading eyebrow="Pilihan minggu ini" title="Destinasi yang bikin ingin segera berangkat" copy={useLive?"Kurasi provinsi Dolan — data dari katalog lokal, bukan foto stock.":"Kurasi marketing Dolan — bukan ranking aktivitas otomatis. Cari provinsi di atas untuk mulai menjelajah destinasi."} action="Lihat semua destinasi"/>{feedError&&destinations.length===0?<FeedStateBox title="Destinasi belum bisa dimuat" copy={feedError} action="Jelajahi provinsi" href={ROUTES.jelajah}/>:destinations.length===0?<FeedStateBox title="Belum ada destinasi kurasi" copy="Jelajahi provinsi untuk mulai menemukan tempat wisata." action="Jelajahi provinsi" href={ROUTES.jelajah}/>:<div className={styles.bento}>{destinations.map(item=><Link href={"href" in item?item.href:ROUTES.jelajah} className={`${styles.destinationCard} ${styles[item.size]}`} key={item.name}>{item.image?<Image src={item.image} alt={item.name} fill unoptimized sizes="(min-width:900px) 45vw,100vw"/>:<div className={styles.destinationFallback} aria-hidden="true"/>}<div><span>{useLive?"Kurasi Dolan":"Kurasi Dolan"}</span><h3>{item.name}</h3><p>{item.meta}</p></div></Link>)}</div>}</section>

 <section className={`${styles.section} ${styles.tripSection}`}><SectionHeading eyebrow="Temukan teman seperjalanan" title="Trip publik yang sedang membuka slot" copy={useLive?"Dari database Dolan — bukan contoh marketing.":"Baca rencananya, cek profil host, lalu kenalan di diskusi sebelum mengajukan join."} action="Jelajahi semua trip"/>{feedError&&publicTrips.length===0?<FeedStateBox title="Trip publik belum bisa dimuat" copy={feedError} action="Coba jelajah trip" href={`${ROUTES.jelajah}?tab=trip`}/>:publicTrips.length===0?<FeedStateBox title="Belum ada trip publik" copy="Jadilah yang pertama membuka slot, atau jelajahi template itinerary." action="Buat trip" href={ROUTES.buatTrip}/>:<div className={styles.tripGrid}>{publicTrips.map(trip=>{const tripHref=useLive?ROUTES.trip(trip.id):ROUTES.jelajah;const mockTrip=!useLive&&"host" in trip?trip as typeof mockPublicTrips[number]:null;return <article className={styles.tripCard} key={trip.id}><div className={styles.tripCover}>{trip.image?<Image src={trip.image} alt={trip.title} fill unoptimized sizes="400px"/>:<div className={styles.tripCoverFallback} aria-hidden="true"/>}<span>Join gratis</span></div><div className={styles.tripBody}>{mockTrip?<div className={styles.host}><Image src={mockTrip.avatar} alt={mockTrip.host} width={38} height={38} unoptimized/><span>Rencana oleh <b>{mockTrip.host}</b><small><Icon name="verified" filled/> Profil terverifikasi</small></span></div>:null}<h3>{trip.title}</h3><p><Icon name="location_on"/> {trip.place}</p><p><Icon name="calendar_month"/> {trip.date}{trip.seats>0?` · Sisa ${trip.seats} slot`:""}</p><div className={styles.tripActions}><Link href={tripHref}>Lihat rencana</Link><Link href={useLive?`${tripHref}#join`:tripHref}>Gabung</Link></div></div></article>})}</div>}</section>

 <section className={`${styles.section} ${styles.howSection}`}><div className={styles.centerHeading}><span>Cara kerja Dolan</span><h2>Lihat perjalananmu terbentuk</h2><p>Tiga langkah sederhana, didemonstrasikan langsung seperti saat kamu memakai Dolan.</p></div><div className={styles.howShowcase}><div className={styles.demoSteps}>{demoSteps.map((step,index)=><button type="button" key={step.title} className={index===demoStep?styles.demoStepActive:""} onClick={()=>setDemoStep(index)}><span>{index+1}</span><div><b>{step.title}</b><p>{step.copy}</p></div><i><u/></i></button>)}</div><div className={styles.demoDevice}><div className={styles.deviceTop}><b>Dolan</b><span/><span/></div><div key={demoStep} className={styles.demoScreen}><HowDemo step={demoStep}/></div><div className={styles.deviceNav}><Icon name="home" filled/><Icon name="explore"/><span><Icon name="add"/></span><Icon name="luggage"/><Icon name="person"/></div></div></div></section>

 <section className={`${styles.section} ${styles.planner}`}><div className={styles.plannerIntro}><span>AI itinerary & budgeting</span><h2>Rute lebih efisien, budget lebih terkendali</h2><p>Dolan AI menyusun urutan kunjungan berdasarkan lokasi, durasi, gaya perjalanan, dan batas budgetmu. Semua hasil tetap bisa diedit.</p><div className={styles.timeline}>{[["Hari 1","Bandara Komodo → Pulau Kelor","Tiba, bertemu peserta, lalu trekking ringan saat sunset."],["Hari 2","Padar → Pink Beach → Manta Point","Rute disusun berurutan agar waktu lebih efisien."],["Hari 3","Kanawa → Labuan Bajo","Snorkeling pagi dan kembali sebelum jadwal kepulangan."]].map(([day,title,copy])=><article key={day}><b>{day}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div><aside className={styles.budgetCard}><div className={styles.aiBadge}><Icon name="auto_awesome"/> Rekomendasi Dolan AI</div><h3>Estimasi budget perjalananmu</h3><p>Menyesuaikan kota asal, tanggal, durasi, transportasi, penginapan, makan, dan aktivitas.</p>{[["Transportasi",42],["Penginapan",24],["Makan",18],["Aktivitas",16]].map(([label,value])=><div className={styles.budgetRow} key={label}><span>{label}<b>{value}%</b></span><i><u style={{width:`${value}%`}}/></i></div>)}<small>Estimasi merupakan panduan dan mengikuti harga aktual penyedia.</small><Link href={ROUTES.buatTrip}>Buat itinerary versiku <Icon name="arrow_forward"/></Link></aside></section>

 <section className={`${styles.section} ${styles.trustSection}`}><div className={styles.trustProfile}><div className={styles.profileImage}><Image src={ASSETS.profile} alt="Dimas, traveler Dolan" fill unoptimized sizes="420px"/><span><Icon name="verified" filled/> Verified traveler</span></div><div><span>Contoh demo · bukan data akun nyata</span><h2>Kenali orangnya sebelum berangkat bersama</h2><p>Setiap anggota punya profil, riwayat trip, koneksi, serta rating dari rekan satu perjalanan.</p><div className={styles.profileStats}><b>16<small>Trip selesai</small></b><b>42<small>Koneksi</small></b><b>4.98<small>DolanScore</small></b></div><Link href={ROUTES.profil}>Lihat contoh profil</Link></div></div><div className={styles.ratingPanel}>{[["Komunikasi & koordinasi","5.0 / 5","100%"],["Sikap & kebersamaan","4.92 / 5","98%"],["Ketepatan waktu","4.85 / 5","97%"]].map(([label,rating,width])=><div className={styles.ratingItem} key={label}><div><span>{label}</span><b>{rating}</b></div><i><u style={{width}}/></i></div>)}<p><Icon name="shield" filled/> Rating hanya diberikan oleh anggota trip yang sudah selesai.</p></div></section>

 <section className={styles.finalCta}><div><span>Petualangan berikutnya menunggumu</span><h2>Siap menjejakkan langkah di bawah langit Indonesia?</h2><p>Buat rencana perjalananmu atau temukan traveler dengan tujuan yang sama.</p><div><Link href={ROUTES.buatTrip}>Buat trip pertamaku <Icon name="arrow_forward"/></Link><Link href={ROUTES.jelajah}>Jelajahi trip publik</Link></div></div></section>

 <section id="faq" className={`${styles.section} ${styles.faqSection}`}><div className={styles.centerHeading}><span>Pertanyaan umum</span><h2>Sebelum mulai dolan</h2><p>Hal penting tentang trip bersama, keamanan, dan itinerary di Dolan.</p></div><div className={styles.faqList}>{faqs.map(([question,answer],index)=><details key={question} open={index===0}><summary><span>{question}</span><Icon name="add"/></summary><p>{answer}</p></details>)}</div></section>

 {error&&<div className={styles.modalBackdrop} onMouseDown={e=>e.target===e.currentTarget&&closeError()}>
  <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1} ref={dialogRef}>
   <div className={styles.modalHeader}><div><span>Hasil pencarian</span><h2 id="result-title">Provinsi tidak ditemukan</h2></div><button onClick={closeError} aria-label="Tutup"><Icon name="close"/></button></div>
   <StateBox title="Ups, belum bisa menjelajah." copy={error} action="Ubah pencarian" onClick={closeError}/>
  </div>
 </div>}
 </>;
}
function SectionHeading({eyebrow,title,copy,action}:{eyebrow:string;title:string;copy:string;action:string}){return <div className={styles.sectionHeading}><div><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div><Link href={ROUTES.jelajah}>{action} <Icon name="arrow_forward"/></Link></div>}
function StateBox({title,copy,action,onClick}:{title:string;copy:string;action:string;onClick:()=>void}){return <div className={styles.stateBox}><b>{title}</b><p>{copy}</p><button onClick={onClick}>{action}</button></div>}
function FeedStateBox({title,copy,action,href}:{title:string;copy:string;action:string;href:string}){return <div className={styles.stateBox}><b>{title}</b><p>{copy}</p><Link href={href}>{action}</Link></div>}
function HowDemo({step}:{step:number}){
 if(step===0)return <><span className={styles.demoLabel}>Cari petualangan</span><h3>Mau dolan ke mana?</h3><div className={styles.demoSearch}><Icon name="search"/> Cari kota atau destinasi <b><Icon name="arrow_forward"/></b></div><div className={styles.demoCards}><article style={{position:"relative"}}><Image src={unsplash.bali} alt="Nusa Penida" fill unoptimized sizes="220px"/><span>Nusa Penida<small>12 trip tersedia</small></span></article><article style={{position:"relative"}}><Image src={unsplash.komodo} alt="Labuan Bajo" fill unoptimized sizes="220px"/><span>Labuan Bajo<small>8 trip tersedia</small></span></article></div></>;
 if(step===1)return <><span className={styles.demoLabel}>Dolan AI bekerja</span><h3>Itinerary sesuai budget</h3><div className={styles.demoBudget}><span>Budget perjalanan <b>Rp2.500.000</b></span><i><u/></i></div><div className={styles.demoTimeline}>{["Sunrise di Pulau Padar","Pink Beach & Manta Point","Sunset di Pulau Kelor"].map((item,index)=><article key={item}><b>{index+1}</b><span>{item}<small>{index===0?"05.00–08.30":"Rute telah dioptimalkan"}</small></span></article>)}</div></>;
 return <><span className={styles.demoLabel}>Teman ditemukan</span><h3>Kenalan sebelum berangkat</h3><div className={styles.demoMatch}><div style={{position:"relative"}}><Image src={ASSETS.hostSinta} alt="Sinta" fill unoptimized sizes="60px"/></div><span><b>Sinta</b><small>4.92 · 8 trip selesai</small></span><i><Icon name="verified" filled/></i></div><div className={styles.demoChat}><p>Hai! Aku juga berangkat dari Jogja 👋</p><p>Yuk diskusi rutenya di grup Dolan.</p></div><button type="button" className={styles.demoJoin}>Lihat trip & kenalan</button></>;
}
