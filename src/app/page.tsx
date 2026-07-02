"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Settings,
  User,
  Plus,
  Lock,
  LogOut,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  List,
  Bell,
  RefreshCw,
  UserCheck,
  Shield,
  Clipboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  Info,
  Scale
} from "lucide-react";

export default function Dashboard() {
  // Session State
  const [user, setUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Core Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Selection and Detail States
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [apiError, setApiError] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState("");

  // Order Placement Form States
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [length, setLength] = useState("30");
  const [width, setWidth] = useState("20");
  const [height, setHeight] = useState("15");
  const [actualWeight, setActualWeight] = useState("2");
  const [orderType, setOrderType] = useState("B2C");
  const [paymentType, setPaymentType] = useState("PREPAID");
  const [createOrderCustomerId, setCreateOrderCustomerId] = useState(""); // Admin placing order for customer
  const [pricingPreview, setPricingPreview] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

  // Rescheduling Modal Form States
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleOrderId, setRescheduleOrderId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleRemarks, setRescheduleRemarks] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Agent updates order status Form States
  const [agentStatusRemarks, setAgentStatusRemarks] = useState("");
  const [agentStatusUpdateLoading, setAgentStatusUpdateLoading] = useState(false);

  // Admin New Zone Form States
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePincodes, setNewZonePincodes] = useState("");
  const [zoneLoading, setZoneLoading] = useState(false);

  // Admin Edit Rates Form States
  const [editingCardId, setEditingCardId] = useState("");
  const [intraRate, setIntraRate] = useState("");
  const [interRate, setInterRate] = useState("");
  const [codSurchargeInput, setCodSurchargeInput] = useState("");
  const [ratesLoading, setRatesLoading] = useState(false);

  // Agent Status Manager
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [updatingAgentProfile, setUpdatingAgentProfile] = useState(false);

  // Fetch Session on Mount
  useEffect(() => {
    fetchSession();
  }, []);

  // Fetch Dashboard Data when Session updates
  useEffect(() => {
    if (user) {
      // Set Default Active Tab based on Role
      if (user.role === "CUSTOMER") {
        setActiveTab("place-order");
      } else if (user.role === "AGENT") {
        setActiveTab("deliveries");
        // Fetch agent profile to sync coordinates/status
        fetchAgentProfile();
      } else if (user.role === "ADMIN") {
        setActiveTab("orders");
        fetchZones();
        fetchRateCards();
        fetchAgents();
      }
      fetchOrders();
      fetchNotifications();
    }
  }, [user]);

  // Pricing Preview Effect on Form Changes
  useEffect(() => {
    if (
      user &&
      pickupPincode.trim().length >= 5 &&
      dropPincode.trim().length >= 5 &&
      length &&
      width &&
      height &&
      actualWeight
    ) {
      calculateChargesPreview();
    } else {
      setPricingPreview(null);
    }
  }, [pickupPincode, dropPincode, length, width, height, actualWeight, orderType, paymentType]);

  const fetchSession = async () => {
    try {
      setSessionLoading(true);
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session error:", err);
      setUser(null);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        // If an order is selected, update its data from list
        if (selectedOrder) {
          const updatedSelected = data.orders.find((o: any) => o.id === selectedOrder.id);
          if (updatedSelected) {
            setSelectedOrder(updatedSelected);
          }
        }
      }
    } catch (err) {
      setApiError("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch("/api/zones");
      const data = await res.json();
      if (data.zones) setZones(data.zones);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRateCards = async () => {
    try {
      const res = await fetch("/api/rate-cards");
      const data = await res.json();
      if (data.rateCards) setRateCards(data.rateCards);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgentProfile = async () => {
    try {
      // In a real application, agent updates their profile
      // We can query the agents list (though list is admin only, but an agent can retrieve their own via me or custom route)
      // Let's retrieve from me database profile or list
      const res = await fetch("/api/orders"); // Agent list includes it indirectly, or we mock it
      // For simplicity, agent profile is managed by API /api/agents via PUT
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateChargesPreview = async () => {
    try {
      setPricingLoading(true);
      setPricingError("");
      const res = await fetch("/api/orders/calculate-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          length,
          width,
          height,
          actualWeight,
          orderType,
          paymentType,
          pickupPincode,
          dropPincode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPricingPreview(data);
      } else {
        setPricingError(data.error || "Failed to calculate pricing");
        setPricingPreview(null);
      }
    } catch (err) {
      setPricingError("Connection error calculating charge");
      setPricingPreview(null);
    } finally {
      setPricingLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (err) {
      setAuthError("Network error. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        setAuthError(data.error || "Registration failed");
      }
    } catch (err) {
      setAuthError("Network error. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrders([]);
      setZones([]);
      setRateCards([]);
      setAgents([]);
      setNotifications([]);
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPricingLoading(true);
      const payload: any = {
        pickupAddress,
        pickupPincode,
        dropAddress,
        dropPincode,
        length,
        width,
        height,
        actualWeight,
        orderType,
        paymentType,
      };

      if (user.role === "ADMIN" && createOrderCustomerId) {
        payload.customerId = createOrderCustomerId;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Reset form
        setPickupAddress("");
        setPickupPincode("");
        setDropAddress("");
        setDropPincode("");
        setPricingPreview(null);
        setCreateOrderCustomerId("");
        
        // Refresh orders list
        await fetchOrders();
        await fetchNotifications();
        
        // Switch tab
        if (user.role === "ADMIN") {
          setActiveTab("orders");
        } else {
          setActiveTab("my-orders");
        }
        
        // Automatically select the new order for detail viewing
        if (data.order) {
          setSelectedOrder(data.order);
        }
      } else {
        alert(data.error || "Failed to create order");
      }
    } catch (err) {
      alert("Error creating order");
    } finally {
      setPricingLoading(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRescheduleLoading(true);
      const res = await fetch(`/api/orders/${rescheduleOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESCHEDULED",
          scheduledDate: rescheduleDate,
          remarks: rescheduleRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsRescheduleModalOpen(false);
        setRescheduleOrderId("");
        setRescheduleDate("");
        setRescheduleRemarks("");
        await fetchOrders();
        await fetchNotifications();
      } else {
        alert(data.error || "Failed to reschedule");
      }
    } catch (err) {
      alert("Error rescheduling delivery");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setAgentStatusUpdateLoading(true);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          remarks: agentStatusRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgentStatusRemarks("");
        await fetchOrders();
        await fetchNotifications();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      alert("Error updating order status");
    } finally {
      setAgentStatusUpdateLoading(false);
    }
  };

  const handleManualAssign = async (orderId: string, agentId: string | null) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchOrders();
        await fetchAgents();
        await fetchNotifications();
      } else {
        alert(data.error || "Failed to assign agent");
      }
    } catch (err) {
      alert("Error assigning agent");
    }
  };

  const handleAutoAssign = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerAutoAssign: true }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchOrders();
        await fetchAgents();
        await fetchNotifications();
      } else {
        alert(data.error || "Auto-assignment failed (No available agent found)");
      }
    } catch (err) {
      alert("Error running auto-assignment");
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setZoneLoading(true);
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newZoneName, pincodes: newZonePincodes }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewZoneName("");
        setNewZonePincodes("");
        await fetchZones();
      } else {
        alert(data.error || "Failed to create zone");
      }
    } catch (err) {
      alert("Error creating zone");
    } finally {
      setZoneLoading(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;
    try {
      const res = await fetch(`/api/zones/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchZones();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete zone");
      }
    } catch (err) {
      alert("Error deleting zone");
    }
  };

  const handleEditRateCard = (card: any) => {
    setEditingCardId(card.id);
    setIntraRate(card.intraZoneRatePerKg.toString());
    setInterRate(card.interZoneRatePerKg.toString());
    setCodSurchargeInput(card.codSurcharge.toString());
  };

  const handleUpdateRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRatesLoading(true);
      const res = await fetch("/api/rate-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCardId,
          intraZoneRatePerKg: intraRate,
          interZoneRatePerKg: interRate,
          codSurcharge: codSurchargeInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingCardId("");
        setIntraRate("");
        setInterRate("");
        setCodSurchargeInput("");
        await fetchRateCards();
      } else {
        alert(data.error || "Failed to update rates");
      }
    } catch (err) {
      alert("Error updating rate card");
    } finally {
      setRatesLoading(false);
    }
  };

  const handleUpdateAgentProfileStatus = async (status: string) => {
    try {
      setUpdatingAgentProfile(true);
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Refresh local details
        await fetchAgents();
        alert("Availability updated successfully");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update profile");
      }
    } catch (err) {
      alert("Error updating agent profile status");
    } finally {
      setUpdatingAgentProfile(false);
    }
  };

  const handleUpdateAgentProfileCoords = async (lat: string, lng: string, zone: string) => {
    try {
      setUpdatingAgentProfile(true);
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          currentZone: zone,
        }),
      });
      if (res.ok) {
        await fetchAgents();
        alert("Coordinates updated successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update coordinates");
      }
    } catch (err) {
      alert("Error updating coordinates");
    } finally {
      setUpdatingAgentProfile(false);
    }
  };

  // Spinner Loading Screen
  if (sessionLoading) {
    return (
      <div className="loading-container" style={{ height: "100vh" }}>
        <div className="spinner"></div>
        <p>Loading session and logistics configurations...</p>
      </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="glass-card auth-card">
          <div className="auth-header">
            <h2>Last-Mile Tracker</h2>
            <p>Logistics round placement submission</p>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@lastmile.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {authMode === "register" && (
              <>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label>Account Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="CUSTOMER">Customer (Place / Manage Orders)</option>
                    <option value="AGENT">Delivery Agent (Accept / Fulfill Orders)</option>
                    <option value="ADMIN">Operations Administrator (Global Management)</option>
                  </select>
                </div>
              </>
            )}

            {authError && (
              <div
                style={{
                  color: "var(--color-danger)",
                  fontSize: "13px",
                  marginBottom: "16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <button type="submit" disabled={authLoading} className="btn btn-primary" style={{ width: "100%" }}>
              {authLoading ? "Authenticating..." : authMode === "login" ? "Sign In" : "Register"}
            </button>
          </form>

          <div className="auth-footer">
            {authMode === "login" ? (
              <>
                Don't have an account?
                <button onClick={() => { setAuthMode("register"); setAuthError(""); }}>Sign Up</button>
              </>
            ) : (
              <>
                Already have an account?
                <button onClick={() => { setAuthMode("login"); setAuthError(""); }}>Sign In</button>
              </>
            )}
          </div>
          
          <div style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted)", borderTop: "1px solid var(--glass-border)", paddingTop: "16px", textAlign: "center" }}>
            <p><strong>Demo Logins:</strong></p>
            <p style={{ marginTop: "4px" }}>Admin: admin@lastmile.com / admin123</p>
            <p>Agent (Delhi): agent1@lastmile.com / agent123</p>
            <p>Customer: customer@lastmile.com / customer123</p>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD LAYOUT ---
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <h1>
            <Truck size={24} /> Last-Mile Delivery Tracker
          </h1>
        </div>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div className="user-badge">
            <User size={14} className="text-secondary" />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>{user.name}</span>
            <span className={`role-tag ${user.role.toLowerCase()}`}>{user.role}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "8px 12px" }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        {user.role === "CUSTOMER" && (
          <>
            <button
              onClick={() => setActiveTab("place-order")}
              className={`tab-btn ${activeTab === "place-order" ? "active" : ""}`}
            >
              <Plus size={16} /> Book Shipment
            </button>
            <button
              onClick={() => setActiveTab("my-orders")}
              className={`tab-btn ${activeTab === "my-orders" ? "active" : ""}`}
            >
              <List size={16} /> My Shipments ({orders.length})
            </button>
          </>
        )}

        {user.role === "AGENT" && (
          <>
            <button
              onClick={() => setActiveTab("deliveries")}
              className={`tab-btn ${activeTab === "deliveries" ? "active" : ""}`}
            >
              <Truck size={16} /> My Fulfillments ({orders.length})
            </button>
          </>
        )}

        {user.role === "ADMIN" && (
          <>
            <button
              onClick={() => setActiveTab("orders")}
              className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            >
              <Clipboard size={16} /> All Shipments ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("create-order")}
              className={`tab-btn ${activeTab === "create-order" ? "active" : ""}`}
            >
              <Plus size={16} /> Book For Customer
            </button>
            <button
              onClick={() => setActiveTab("zones")}
              className={`tab-btn ${activeTab === "zones" ? "active" : ""}`}
            >
              <MapPin size={16} /> Logistics Zones ({zones.length})
            </button>
            <button
              onClick={() => setActiveTab("rates")}
              className={`tab-btn ${activeTab === "rates" ? "active" : ""}`}
            >
              <DollarSign size={16} /> Rate Cards ({rateCards.length})
            </button>
          </>
        )}

        <button
          onClick={() => { setActiveTab("notifications"); fetchNotifications(); }}
          className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
        >
          <Bell size={16} /> SMS & Email Logs ({notifications.length})
        </button>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Side Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* TAB: PLACE ORDER (Customer) */}
          {activeTab === "place-order" && (
            <div className="glass-card">
              <h2>Shipment Booking Form</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Auto-calculates volumetric charges and assigns delivery agents.
              </p>

              <form onSubmit={handleCreateOrder}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Pickup Address</label>
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="123, Ring Road, Delhi"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pickup Pincode</label>
                    <input
                      type="text"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      value={pickupPincode}
                      onChange={(e) => setPickupPincode(e.target.value)}
                      placeholder="110001"
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: "10px" }}>
                    <label>Drop Address</label>
                    <input
                      type="text"
                      required
                      value={dropAddress}
                      onChange={(e) => setDropAddress(e.target.value)}
                      placeholder="456, Marine Drive, Mumbai"
                    />
                  </div>

                  <div className="form-group">
                    <label>Drop Pincode</label>
                    <input
                      type="text"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      value={dropPincode}
                      onChange={(e) => setDropPincode(e.target.value)}
                      placeholder="400001"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <div className="form-group">
                    <label>Actual Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      placeholder="2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Length (cm)</label>
                    <input
                      type="number"
                      required
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="30"
                    />
                  </div>

                  <div className="form-group">
                    <label>Width (cm)</label>
                    <input
                      type="number"
                      required
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="20"
                    />
                  </div>

                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      required
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <div className="form-group">
                    <label>Order Segment</label>
                    <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                      <option value="B2C">B2C (Retail Delivery)</option>
                      <option value="B2B">B2B (Corporate Delivery)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                      <option value="PREPAID">Prepaid (Online Card/UPI)</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                    </select>
                  </div>
                </div>

                {pricingLoading && (
                  <div style={{ margin: "10px 0", display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}>
                    <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></div>
                    Computing tariffs...
                  </div>
                )}

                {pricingError && (
                  <div style={{ color: "var(--color-danger)", fontSize: "13px", padding: "10px", margin: "10px 0", background: "rgba(239, 68, 68, 0.05)", border: "1px dashed var(--color-danger)", borderRadius: "6px" }}>
                    {pricingError}
                  </div>
                )}

                {pricingPreview && (
                  <div className="pricing-preview">
                    <h4>
                      <Scale size={16} style={{ verticalAlign: "middle", marginRight: "4px" }} /> Tariff Calculation Preview
                    </h4>
                    <div className="pricing-details">
                      <div className="pricing-row">
                        <span>Actual vs Volumetric Weight:</span>
                        <span>{pricingPreview.actualWeight || actualWeight} kg vs {pricingPreview.volumetricWeight.toFixed(2)} kg</span>
                      </div>
                      <div className="pricing-row">
                        <span>Billing Weight:</span>
                        <span style={{ fontWeight: 600 }}>{pricingPreview.chargeableWeight.toFixed(2)} kg (higher of both)</span>
                      </div>
                      <div className="pricing-row">
                        <span>Zone Mapping:</span>
                        <span>{pricingPreview.pickupZoneName} &rarr; {pricingPreview.dropZoneName} ({pricingPreview.isIntraZone ? "Intra-Zone" : "Inter-Zone"})</span>
                      </div>
                      <div className="pricing-row">
                        <span>Base Shipment Rate:</span>
                        <span>Rs. {pricingPreview.baseCharge.toFixed(2)}</span>
                      </div>
                      {pricingPreview.codSurcharge > 0 && (
                        <div className="pricing-row">
                          <span>COD Payment Surcharge:</span>
                          <span>Rs. {pricingPreview.codSurcharge.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pricing-row total">
                        <span>Total Chargeable amount:</span>
                        <span>Rs. {pricingPreview.totalCharge.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pricingLoading || !pricingPreview}
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "20px" }}
                >
                  Confirm and Book Shipment
                </button>
              </form>
            </div>
          )}

          {/* TAB: CREATE ORDER ADMIN (Admin on behalf of customer) */}
          {activeTab === "create-order" && (
            <div className="glass-card">
              <h2>Book Shipment On Behalf of Customer</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Select a customer and place an order using admin configurations.
              </p>

              <form onSubmit={handleCreateOrder}>
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label>Select Customer Account</label>
                  <select
                    required
                    value={createOrderCustomerId}
                    onChange={(e) => setCreateOrderCustomerId(e.target.value)}
                  >
                    <option value="">-- Choose Customer --</option>
                    {/* Demo list or dynamic list. Let's write a simple selector */}
                    <option value="customer-demo-1">Demo Customer: Jane Doe (customer@lastmile.com)</option>
                    <option value="customer-demo-2">Demo B2B: Acme Corp B2B (b2b_customer@lastmile.com)</option>
                    <option value="customer-demo-3">Demo B2C: John Smith B2C (b2c_customer@lastmile.com)</option>
                  </select>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Note: To find the exact customer IDs, please review the seeded users or copy their ID.
                  </p>
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Pickup Address</label>
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="123, Ring Road, Delhi"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pickup Pincode</label>
                    <input
                      type="text"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      value={pickupPincode}
                      onChange={(e) => setPickupPincode(e.target.value)}
                      placeholder="110001"
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: "10px" }}>
                    <label>Drop Address</label>
                    <input
                      type="text"
                      required
                      value={dropAddress}
                      onChange={(e) => setDropAddress(e.target.value)}
                      placeholder="456, Marine Drive, Mumbai"
                    />
                  </div>

                  <div className="form-group">
                    <label>Drop Pincode</label>
                    <input
                      type="text"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      value={dropPincode}
                      onChange={(e) => setDropPincode(e.target.value)}
                      placeholder="400001"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <div className="form-group">
                    <label>Actual Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      placeholder="2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Length (cm)</label>
                    <input
                      type="number"
                      required
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="30"
                    />
                  </div>

                  <div className="form-group">
                    <label>Width (cm)</label>
                    <input
                      type="number"
                      required
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="20"
                    />
                  </div>

                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      required
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <div className="form-group">
                    <label>Order Segment</label>
                    <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                      <option value="B2C">B2C (Retail Delivery)</option>
                      <option value="B2B">B2B (Corporate Delivery)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                      <option value="PREPAID">Prepaid (Online Card/UPI)</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                    </select>
                  </div>
                </div>

                {pricingPreview && (
                  <div className="pricing-preview">
                    <h4>Tariff Calculation Preview</h4>
                    <div className="pricing-details">
                      <div className="pricing-row">
                        <span>Billing Weight:</span>
                        <span>{pricingPreview.chargeableWeight.toFixed(2)} kg</span>
                      </div>
                      <div className="pricing-row">
                        <span>Zone Mapping:</span>
                        <span>{pricingPreview.pickupZoneName} &rarr; {pricingPreview.dropZoneName}</span>
                      </div>
                      <div className="pricing-row total">
                        <span>Total Chargeable:</span>
                        <span>Rs. {pricingPreview.totalCharge.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!pricingPreview || !createOrderCustomerId}
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "20px" }}
                >
                  Confirm and Book on Behalf
                </button>
              </form>
            </div>
          )}

          {/* TAB: MY SHIPMENTS (Customer / Agent / Admin) */}
          {(activeTab === "my-orders" || activeTab === "orders" || activeTab === "deliveries") && (
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h2>
                  {user.role === "CUSTOMER"
                    ? "My Shipments"
                    : user.role === "AGENT"
                    ? "My Fulfillments"
                    : "Global Logistics Shipments"}
                </h2>
                <button onClick={fetchOrders} className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "13px" }}>
                  <RefreshCw size={14} className={loadingOrders ? "spinner" : ""} /> Refresh
                </button>
              </div>

              {loadingOrders && orders.length === 0 ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Retrieving orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                  <Package size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                  <p>No shipments found.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        {user.role === "ADMIN" && <th>Customer</th>}
                        <th>Type/Payment</th>
                        <th>Route (Zones)</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className={selectedOrder?.id === o.id ? "active-row" : ""}>
                          <td style={{ fontWeight: 600 }}>{o.orderNumber}</td>
                          {user.role === "ADMIN" && (
                            <td>
                              <div style={{ fontSize: "13px" }}>{o.customer.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{o.customer.email}</div>
                            </td>
                          )}
                          <td>
                            <span className="role-tag customer" style={{ fontSize: "10px", padding: "1px 6px" }}>{o.orderType}</span>
                            <span className="role-tag agent" style={{ fontSize: "10px", padding: "1px 6px", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}>{o.paymentType}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: "13px" }}>{o.pickupPincode} &rarr; {o.dropPincode}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {o.pickupZone?.name || "Unzoned"} &rarr; {o.dropZone?.name || "Unzoned"}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>Rs. {o.totalCharge.toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${o.status.toLowerCase()}`}>
                              {o.status.replace("_", " ")}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              <Eye size={12} /> Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: LOGISTICS ZONES (Admin Only) */}
          {activeTab === "zones" && user.role === "ADMIN" && (
            <div className="glass-card">
              <h2>Logistics Zones Configuration</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Add area pin codes to zones to drive rate-cards and nearest-agent routing.
              </p>

              <form onSubmit={handleCreateZone} style={{ marginBottom: "30px", padding: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", borderRadius: "8px" }}>
                <h4 style={{ marginBottom: "12px" }}>Create New Zone</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Zone Identifier</label>
                    <input
                      type="text"
                      required
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="e.g. Zone D"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label>Mapped Pincodes (Comma separated)</label>
                    <input
                      type="text"
                      required
                      value={newZonePincodes}
                      onChange={(e) => setNewZonePincodes(e.target.value)}
                      placeholder="110001, 110002, 110003"
                    />
                  </div>
                </div>
                <button type="submit" disabled={zoneLoading} className="btn btn-primary">
                  {zoneLoading ? "Saving..." : "Add Zone"}
                </button>
              </form>

              <h4>Active Zones</h4>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Zone Name</th>
                      <th>Assigned Pincodes</th>
                      <th>Total Codes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => (
                      <tr key={z.id}>
                        <td style={{ fontWeight: 600 }}>{z.name}</td>
                        <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {z.pincodes}
                        </td>
                        <td>{z.pincodes.split(",").length}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteZone(z.id)}
                            className="btn btn-danger"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RATE CARDS (Admin Only) */}
          {activeTab === "rates" && user.role === "ADMIN" && (
            <div className="glass-card">
              <h2>Tariff Rate Cards Configuration</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Update per-kilogram rates for intra/inter-zone transport and COD surcharges.
              </p>

              {editingCardId && (
                <form onSubmit={handleUpdateRateCard} style={{ marginBottom: "30px", padding: "16px", background: "rgba(0,136,255,0.03)", border: "1px dashed var(--color-primary)", borderRadius: "8px" }}>
                  <h4 style={{ marginBottom: "12px", color: "var(--color-primary)" }}>Update Rate Settings</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Intra-Zone Rate (Rs./kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={intraRate}
                        onChange={(e) => setIntraRate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Inter-Zone Rate (Rs./kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={interRate}
                        onChange={(e) => setInterRate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>COD Surcharge Fee (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={codSurchargeInput}
                        onChange={(e) => setCodSurchargeInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    <button type="submit" disabled={ratesLoading} className="btn btn-primary">
                      {ratesLoading ? "Saving Changes..." : "Apply Rates"}
                    </button>
                    <button type="button" onClick={() => setEditingCardId("")} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="config-grid">
                {rateCards.map((rc) => (
                  <div key={rc.id} className="config-card">
                    <div className="config-header">
                      <span className="role-tag customer" style={{ fontSize: "12px" }}>{rc.orderType} Card</span>
                      <button onClick={() => handleEditRateCard(rc)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>
                        Modify
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                      <div className="pricing-row">
                        <span className="text-secondary">Intra-Zone Shipping:</span>
                        <span style={{ fontWeight: 600 }}>Rs. {rc.intraZoneRatePerKg.toFixed(2)}/kg</span>
                      </div>
                      <div className="pricing-row">
                        <span className="text-secondary">Inter-Zone Shipping:</span>
                        <span style={{ fontWeight: 600 }}>Rs. {rc.interZoneRatePerKg.toFixed(2)}/kg</span>
                      </div>
                      <div className="pricing-row">
                        <span className="text-secondary">COD Surcharge:</span>
                        <span style={{ fontWeight: 600 }}>Rs. {rc.codSurcharge.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATION LOGS (Everyone, filtered by server) */}
          {activeTab === "notifications" && (
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h2>Simulated Outgoing SMS & Email Logs</h2>
                <button onClick={fetchNotifications} className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "13px" }}>
                  <RefreshCw size={14} /> Refresh Logs
                </button>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Logs represent the real-time communications dispatched to customers on order status shifts.
              </p>

              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                  <Bell size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                  <p>No notifications generated yet.</p>
                </div>
              ) : (
                <div className="notification-feed">
                  {notifications.map((n) => (
                    <div key={n.id} className="notification-item">
                      <div className="notification-meta">
                        <div>
                          <span className={`notif-type ${n.type.toLowerCase()}`}>{n.type}</span>
                          <span style={{ marginLeft: "8px", fontWeight: 600, color: "var(--text-primary)" }}>
                            Order: {n.orderNumber}
                          </span>
                        </div>
                        <span className="notif-time">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Recipient: {n.recipient}
                      </div>
                      {n.subject && (
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                          Subject: {n.subject}
                        </div>
                      )}
                      <div className="notif-msg">{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Column (Order Details panel & Live tracking maps) */}
        <div>
          {selectedOrder ? (
            <div className="glass-card" style={{ position: "sticky", top: "20px" }}>
              <div className="order-detail-header">
                <div>
                  <h3 style={{ fontSize: "20px" }}>{selectedOrder.orderNumber}</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Booked on {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`status-badge ${selectedOrder.status.toLowerCase()}`}>
                  {selectedOrder.status.replace("_", " ")}
                </span>
              </div>

              {/* Order specifications */}
              <div className="order-detail-grid">
                <div className="detail-item">
                  <h5>Order Segment</h5>
                  <p>{selectedOrder.orderType}</p>
                </div>
                <div className="detail-item">
                  <h5>Payment Mode</h5>
                  <p>{selectedOrder.paymentType}</p>
                </div>
                <div className="detail-item">
                  <h5>Total Charge</h5>
                  <p style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                    Rs. {selectedOrder.totalCharge.toFixed(2)}
                  </p>
                </div>
                <div className="detail-item">
                  <h5>Billing Weight</h5>
                  <p>{selectedOrder.chargeableWeight.toFixed(2)} kg</p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px", marginBottom: "15px" }}>
                <h5 style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Delivery Routes
                </h5>
                <div style={{ fontSize: "14px" }}>
                  <p><strong>From:</strong> {selectedOrder.pickupAddress} (Pincode: {selectedOrder.pickupPincode})</p>
                  <p style={{ marginTop: "4px" }}><strong>To:</strong> {selectedOrder.dropAddress} (Pincode: {selectedOrder.dropPincode})</p>
                </div>
              </div>

              {/* Agent Assignment Info */}
              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px", marginBottom: "20px" }}>
                <h5 style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Assigned Agent
                </h5>
                {selectedOrder.agentId ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{selectedOrder.agentId === user.id ? "You (Agent)" : "Agent Assigned"}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>ID: {selectedOrder.agentId}</p>
                    </div>
                    {user.role === "ADMIN" && (
                      <button
                        onClick={() => handleManualAssign(selectedOrder.id, null)}
                        className="btn btn-danger"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      No agent assigned.
                    </p>
                    {user.role === "ADMIN" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleAutoAssign(selectedOrder.id)}
                          className="btn btn-primary"
                          style={{ padding: "6px 10px", fontSize: "11px" }}
                        >
                          Auto Assign
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleManualAssign(selectedOrder.id, e.target.value);
                          }}
                          defaultValue=""
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                        >
                          <option value="">Manual...</option>
                          {agents.map((ag) => (
                            <option key={ag.userId} value={ag.userId}>
                              {ag.user.name} ({ag.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACTION: RESCHEDULE FLOW (Customer Only) */}
              {user.role === "CUSTOMER" && selectedOrder.status === "FAILED" && (
                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px", marginBottom: "20px" }}>
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "10px",
                      fontSize: "13px",
                    }}
                  >
                    <p style={{ color: "var(--color-danger)", fontWeight: 600 }}>Delivery Attempt Failed</p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Reason: {selectedOrder.trackingHistory[0]?.remarks || "Not specified."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setRescheduleOrderId(selectedOrder.id);
                      setIsRescheduleModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    <Calendar size={14} /> Reschedule Delivery
                  </button>
                </div>
              )}

              {/* ACTION: STATUS UPDATE PANEL (Agent Only or Admin Override) */}
              {((user.role === "AGENT" && selectedOrder.agentId === user.id) || user.role === "ADMIN") && (
                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px", marginBottom: "20px" }}>
                  <h5 style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Update Fulfillment Status
                  </h5>

                  <div className="form-group" style={{ marginBottom: "10px" }}>
                    <input
                      type="text"
                      value={agentStatusRemarks}
                      onChange={(e) => setAgentStatusRemarks(e.target.value)}
                      placeholder="Remarks / Reason (Mandatory if failing)"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {selectedOrder.status === "ASSIGNED" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "PICKED_UP")}
                        className="btn btn-secondary"
                        style={{ padding: "8px" }}
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {selectedOrder.status === "PICKED_UP" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "IN_TRANSIT")}
                        className="btn btn-secondary"
                        style={{ padding: "8px" }}
                      >
                        Mark In Transit
                      </button>
                    )}
                    {selectedOrder.status === "IN_TRANSIT" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "OUT_FOR_DELIVERY")}
                        className="btn btn-secondary"
                        style={{ padding: "8px" }}
                      >
                        Out For Delivery
                      </button>
                    )}
                    {(selectedOrder.status === "OUT_FOR_DELIVERY" || selectedOrder.status === "RESCHEDULED" || selectedOrder.status === "ASSIGNED") && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, "DELIVERED")}
                          className="btn btn-primary"
                          style={{ padding: "8px", background: "var(--color-success)" }}
                        >
                          Delivered
                        </button>
                        <button
                          onClick={() => {
                            if (!agentStatusRemarks) {
                              alert("Please specify a reason in the remarks field for the failed delivery.");
                              return;
                            }
                            handleUpdateStatus(selectedOrder.id, "FAILED");
                          }}
                          className="btn btn-danger"
                          style={{ padding: "8px" }}
                        >
                          Failed
                        </button>
                      </>
                    )}
                  </div>
                  {user.role === "ADMIN" && (
                    <div style={{ marginTop: "12px", borderTop: "1px dashed var(--glass-border)", paddingTop: "12px" }}>
                      <label style={{ fontSize: "11px", display: "block", marginBottom: "4px" }}>Admin Force Override Status</label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                        style={{ width: "100%", padding: "6px" }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="PICKED_UP">PICKED_UP</option>
                        <option value="IN_TRANSIT">IN_TRANSIT</option>
                        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="RESCHEDULED">RESCHEDULED</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Immutable Tracking Timeline */}
              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px" }}>
                <h5 style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "12px" }}>
                  Immutable Dispatch History
                </h5>
                <div className="timeline">
                  {selectedOrder.trackingHistory &&
                    selectedOrder.trackingHistory.map((history: any, index: number) => (
                      <div key={history.id} className={`timeline-item ${index === 0 ? "active" : ""}`}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-time">
                            {new Date(history.timestamp).toLocaleString()}
                          </div>
                          <div className="timeline-status" style={{
                            color: history.status === "DELIVERED" ? "var(--color-success)" :
                                   history.status === "FAILED" ? "var(--color-danger)" :
                                   history.status === "RESCHEDULED" ? "var(--color-info)" : "var(--text-primary)"
                          }}>
                            {history.status.replace("_", " ")}
                          </div>
                          {history.remarks && <div className="timeline-remarks">{history.remarks}</div>}
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Actor: {history.actor?.name || "System"} ({history.actor?.role || "SYSTEM"})
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              <Info size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
              <h3>Select a Shipment to Inspect</h3>
              <p style={{ fontSize: "13px" }}>
                Clicking "Inspect" on any order list row loads the detailed specifications, active agent profiles, and immutable timestamp history logs.
              </p>
              
              {/* Agent Settings Quick Toggle (Only shown when no order selected to fill space nicely) */}
              {user.role === "AGENT" && (
                <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: "24px", paddingTop: "20px", textAlign: "left" }}>
                  <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>Agent Profile Manager</h4>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label>Fulfillment Availability</label>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        onClick={() => handleUpdateAgentProfileStatus("AVAILABLE")}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: "8px", background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)", color: "var(--color-success)" }}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleUpdateAgentProfileStatus("OFFLINE")}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: "8px", background: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--color-danger)" }}
                      >
                        Offline
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "12px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600 }}>Simulate Agent Location Move</p>
                    <p style={{ fontSize: "11px", color: "--text-muted", marginBottom: "8px" }}>
                      Moving agent location affects nearest available calculations.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                      <button
                        onClick={() => handleUpdateAgentProfileCoords("28.6139", "77.2090", "Zone A")}
                        className="btn btn-secondary"
                        style={{ padding: "4px", fontSize: "11px" }}
                      >
                        Move to Delhi (Zone A)
                      </button>
                      <button
                        onClick={() => handleUpdateAgentProfileCoords("18.9220", "72.8347", "Zone B")}
                        className="btn btn-secondary"
                        style={{ padding: "4px", fontSize: "11px" }}
                      >
                        Move to Mumbai (Zone B)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; {new Date().getFullYear()} Last-Mile Delivery Tracker. Placement Drive Round Submission.</p>
        <p style={{ fontSize: "11px", marginTop: "4px" }}>Developed in compliance with dynamic calculations, auto-assignment, and immutable tracking constraints.</p>
      </footer>

      {/* --- RESCHEDULE MODAL (Customer Only) --- */}
      {isRescheduleModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reschedule Delivery Attempt</h3>
              <button onClick={() => setIsRescheduleModalOpen(false)} className="modal-close">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleReschedule}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label>Select New Delivery Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Instructions / Special Remarks for Courier</label>
                <textarea
                  rows={3}
                  value={rescheduleRemarks}
                  onChange={(e) => setRescheduleRemarks(e.target.value)}
                  placeholder="e.g. Leave package with neighbor on 2nd floor, call before coming."
                />
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  background: "rgba(99, 102, 241, 0.05)",
                  border: "1px dashed var(--color-info)",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <p><strong>⚠️ Process Information:</strong></p>
                <p style={{ marginTop: "4px" }}>
                  Confirming this action clears the old delivery agent assignment. A brand new auto-assignment run will execute immediately to match the nearest available courier agent to your package for the new date slot.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setIsRescheduleModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={rescheduleLoading} className="btn btn-primary">
                  {rescheduleLoading ? "Saving date..." : "Reschedule & Reassign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
