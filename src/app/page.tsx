"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { ElevationProfile } from "@/components/ElevationProfile";
import { nearestRouteIndexByDistance } from "@/lib/geo";
import { Poi, PoisPayload, RoutePayload } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="map-loading">Chargement de la carte...</div>
});

const RADIUS_KM = 5;

const categoryLegend = {
  water: { color: "#38bdf8", label: "Points d'eau" },
  bar: { color: "#f59e0b", label: "Bars / cafes" },
  food_shop: { color: "#34d399", label: "Commerces alimentaires" }
} as const;

export default function HomePage() {
  const [route, setRoute] = useState<RoutePayload | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [poisError, setPoisError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [loadingPois, setLoadingPois] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [focusedDistanceKm, setFocusedDistanceKm] = useState<number | null>(null);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  useEffect(() => {
    async function loadRoute() {
      setLoadingRoute(true);
      try {
        const response = await fetch("/api/route", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Impossible de charger la trace GPX.");
        }
        const payload = (await response.json()) as RoutePayload;
        setRoute(payload);
      } catch (error) {
        setPoisError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setLoadingRoute(false);
      }
    }

    async function loadPois() {
      setLoadingPois(true);
      try {
        const response = await fetch(`/api/pois?radiusKm=${RADIUS_KM}`, { cache: "no-store" });
        const payload = (await response.json()) as PoisPayload;
        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger les POI.");
        }
        setPois(payload.pois);
      } catch (error) {
        setPoisError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setLoadingPois(false);
      }
    }

    void loadRoute();
    void loadPois();
  }, []);

  const poiCounts = useMemo(() => {
    return pois.reduce(
      (acc, poi) => {
        acc[poi.category] += 1;
        return acc;
      },
      { water: 0, bar: 0, food_shop: 0 }
    );
  }, [pois]);

  const onPoiSelect = (distKm: number) => {
    setFocusedDistanceKm(distKm);
    if (!route) {
      return;
    }
    const index = nearestRouteIndexByDistance(route.points, distKm);
    setActiveIndex(index);
  };

  if (loadingRoute) {
    return <main className="app-shell app-message">Chargement de la trace...</main>;
  }

  if (!route) {
    return <main className="app-shell app-message">Trace indisponible.</main>;
  }

  return (
    <main className="app-shell">
      <MapView
        points={route.points}
        pois={pois}
        activeIndex={activeIndex}
        onHoverIndex={(index) => setActiveIndex(index)}
        onPoiSelect={onPoiSelect}
      />

      <section className={`hud-panel ${isHudCollapsed ? "collapsed" : ""}`} data-testid="hud-panel">
        <div className="hud-header">
          <h1>{route.routeName}</h1>
          <button
            type="button"
            className="hud-toggle"
            onClick={() => setIsHudCollapsed((value) => !value)}
            aria-label={isHudCollapsed ? "Ouvrir le panneau d'informations" : "Replier le panneau d'informations"}
          >
            {isHudCollapsed ? "+" : "−"}
          </button>
        </div>

        {!isHudCollapsed ? (
          <>
            <p className="hud-subtitle">Trace velo route, eau, ravitaillement et profil synchronise.</p>
            <div className="hud-stats">
              <div>
                <span>Distance</span>
                <strong>{route.stats.distanceKm} km</strong>
              </div>
              <div>
                <span>D+</span>
                <strong>{route.stats.gainM} m</strong>
              </div>
              <div>
                <span>D-</span>
                <strong>{route.stats.lossM} m</strong>
              </div>
              <div>
                <span>Alt min/max</span>
                <strong>
                  {route.stats.minEle} / {route.stats.maxEle} m
                </strong>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="legend-panel" data-testid="legend-panel" aria-label="Legende des points d'interet">
        <p>Rayon POI: {RADIUS_KM} km</p>
        <div className="legend-items">
          <span style={{ color: categoryLegend.water.color }}>● {categoryLegend.water.label}: {poiCounts.water}</span>
          <span style={{ color: categoryLegend.bar.color }}>● {categoryLegend.bar.label}: {poiCounts.bar}</span>
          <span style={{ color: categoryLegend.food_shop.color }}>● {categoryLegend.food_shop.label}: {poiCounts.food_shop}</span>
        </div>
      </section>

      <section
        className={`profile-panel ${isProfileExpanded ? "expanded" : ""}`}
        data-testid="profile-overlay"
        aria-label="Profil altimetrique"
      >
        <div className="profile-header">
          <h2>Profil altimetrique</h2>
          <button
            type="button"
            className="profile-toggle"
            onClick={() => setIsProfileExpanded((value) => !value)}
            aria-label={isProfileExpanded ? "Compacter le profil" : "Agrandir le profil"}
          >
            {isProfileExpanded ? "Compact" : "Agrandir"}
          </button>
        </div>
        <ElevationProfile
          points={route.points}
          activeIndex={activeIndex}
          focusedDistanceKm={focusedDistanceKm}
          onHoverIndex={(index) => setActiveIndex(index)}
          compact={!isProfileExpanded}
        />
      </section>

      {loadingPois ? <aside className="status-toast">Chargement des POI...</aside> : null}
      {poisError ? <aside className="status-toast error">{poisError}</aside> : null}
      {!loadingPois && !poisError && pois.length === 0 ? (
        <aside className="status-toast">Aucun point d'eau ou ravitaillement detecte dans {RADIUS_KM} km.</aside>
      ) : null}
    </main>
  );
}
