"use client";

import React, { useState, useEffect } from "react";
import { FaBus } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Layout from "../components/Layout";
import Header from "../components/Header";
import Pagination from "../components/Pagination";
import { fetchAllFuelLogs } from "@/app/services/fuellogsService";
import { getAllVehicles } from "@/app/services/vehicleService";
import { getAllMaintenanceScheduling } from "@/app/services/maintenanceService";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { groupByTimeInterval } from "../helper/fuel-helper";
import { useRouter } from "next/navigation";

// Import InteractionMode from chart.js
import { InteractionMode } from 'chart.js';

const FuelMonitoring = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [timeInterval, setTimeInterval] = useState("daily");
  const [selectedBus, setSelectedBus] = useState(null);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [error, setError] = useState(null);

  const itemsPerPage = 3; // Number of buses to display per page

  // Fetch data: vehicles, fuel logs, and maintenance schedules
  const loadData = async () => {
    try {
      const [logs, vehicleData, maintenanceData] = await Promise.all([
        fetchAllFuelLogs(),
        getAllVehicles(),
        getAllMaintenanceScheduling(),
      ]);
      setFuelLogs(logs);
      setVehicles(vehicleData);
      setMaintenanceSchedules(maintenanceData);
      if (vehicleData.length > 0) {
        setSelectedBus(vehicleData[0].vehicle_id); // Default to the first vehicle
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data. Please try again.");
    }
  };

  // Fetch data when the component mounts
  useEffect(() => {
    loadData();
  }, []);

  // Generate chart data based on time interval and selected bus
  const chartData = {
    daily: groupByTimeInterval(
      fuelLogs.filter((log) => log.vehicle_id === selectedBus),
      "daily"
    ),

    weekly: groupByTimeInterval(
      fuelLogs.filter((log) => log.vehicle_id === selectedBus),
      "weekly"
    ),
    monthly: groupByTimeInterval(
      fuelLogs.filter((log) => log.vehicle_id === selectedBus),
      "monthly"
    ),
    yearly: groupByTimeInterval(
      fuelLogs.filter((log) => log.vehicle_id === selectedBus),
      "yearly"
    ),
  };

  const currentData = chartData[timeInterval] || chartData.daily;

  const data = {
    labels: currentData.map((entry) => entry.label), // Labels based on time interval
    datasets: [
      {
        label: "Distance (KM)",
        data: currentData.map((entry) => entry.distance), // Distance data
        borderColor: "red", // Red color for distance
        backgroundColor: "rgba(255, 99, 132, 0.2)", // Light red background for distance
      },
      {
        label: "Liters Used (L)",
        data: currentData.map((entry) => entry.liters), // Liters data
        borderColor: "blue", // Blue color for liters
        backgroundColor: "rgba(54, 162, 235, 0.2)", // Light blue background for liters
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxRotation: 90,
          minRotation: 45,
        },
      },
    },
    plugins: {
      tooltip: {
        enabled: true, // Enable tooltips
        mode: 'nearest' as InteractionMode, // Set to a valid InteractionModeMap key, like 'nearest'
        intersect: false, // Show tooltip when hovering over any point in the dataset
        callbacks: {
          title: (tooltipItem) => {
            // Display the label (date, day, or period) as the title of the tooltip
            return tooltipItem[0].label;
          },
          label: (tooltipItem) => {
            // Get the dataset label and value for the tooltip (Distance and Liters)
            const datasetIndex = tooltipItem.datasetIndex;
            const data = tooltipItem.raw;
            if (datasetIndex === 0) {
              // Distance (KM) dataset
              return `Distance: ${data} KM`;
            } else if (datasetIndex === 1) {
              // Liters Used (L) dataset
              return `Liters: ${data} L`;
            }
          },
        },
      },
    },
  };

  const totalPages = Math.ceil(vehicles.length / itemsPerPage);

  const displayedBuses = vehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleBusClick = (busId) => {
    setSelectedBus(busId);
  };
  const chartWidth = Math.max(1000, currentData.length * 50);
  const navigateToViewRecord = () => {
    const maintenance = maintenanceSchedules.find(
      (schedule) =>
        schedule.vehicle_id === selectedBus &&
        schedule.maintenance_status === "active"
    );
    const status = maintenance ? "Maintenance" : "On Operation";
    router.push(
      `/fuel-monitoring/view-record?bus=${selectedBus}&status=${encodeURIComponent(
        status
      )}`
    );
  };

  const handlePrint = async () => {
    const chartElement = document.querySelector(
      ".chart-container"
    ) as HTMLElement; // Cast to HTMLElement

    if (!chartElement) return;

    try {
      const canvas = await html2canvas(chartElement);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      pdf.save(`fuel-monitoring-bus-${selectedBus}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Layout>
      <Header title="Fuel Monitoring" />
      <section className="p-4">
        <div className="flex justify-center items-center w-full">
          <div className="relative w-full sm:w-[80%] lg:w-[70%] xl:w-[95%]">
            <div className="relative chart-container w-full h-[500px] bg-white p-4 rounded-lg shadow-lg">
              <div className="absolute inset-0 flex justify-center items-center opacity-10 z-0">
                <span className="text-6xl font-bold text-gray-500">
                  {selectedBus ? `Bus ${selectedBus}` : "Loading..."}
                </span>
              </div>
              <Line
                data={data}
                options={options}
                className="relative z-10"
                height={500}
              />
            </div>
          </div>
        </div>

        <div className="chart-options w-full sm:w-5/6 mx-auto flex flex-col sm:flex-row justify-between items-center mt-3">
          <div className="time-intervals flex flex-col sm:flex-row space-y-3 sm:space-x-3 sm:space-y-0 mb-3 sm:mb-0 w-full sm:w-auto">
            {["daily", "weekly", "monthly", "yearly"].map((interval) => (
              <button
                key={interval}
                className={`px-2 py-1 rounded w-full sm:w-auto ${
                  timeInterval === interval
                    ? "bg-blue-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
                onClick={() => setTimeInterval(interval)}
              >
                {interval.charAt(0).toUpperCase() + interval.slice(1)}
              </button>
            ))}
          </div>

          <div className="right-btns flex flex-col sm:flex-row space-y-3 sm:space-x-4 sm:space-y-0 mt-3 sm:mt-0 w-full sm:w-auto ml-auto">
            <button
              onClick={navigateToViewRecord}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full sm:w-auto"
              disabled={!selectedBus}
            >
              View Record
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full sm:w-auto"
            >
              Print Chart as PDF
            </button>
          </div>
        </div>

        <div className="buses mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full sm:w-5/6 mx-auto">
          {displayedBuses.map((bus) => {
            const maintenance = maintenanceSchedules.find(
              (schedule) =>
                schedule.vehicle_id === bus.vehicle_id &&
                schedule.maintenance_status === "active"
            );

            const bgColor = maintenance ? "bg-yellow-400" : "bg-green-400";
            const textColor = maintenance ? "text-black" : "text-white";

            return (
              <div
                key={bus.vehicle_id}
                className={`flex flex-col p-4 rounded-lg shadow cursor-pointer ${bgColor} ${
                  selectedBus === bus.vehicle_id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => handleBusClick(bus.vehicle_id)}
              >
                <FaBus size={24} className="mb-2" />
                <span className={`font-bold ${textColor}`}>
                  Bus {bus.vehicle_id} - {bus.plate_number}
                </span>
                <span className={`${textColor}`}>
                  {maintenance
                    ? `${maintenance.maintenance_type} Scheduled`
                    : "On Operation"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>
    </Layout>
  );
};

export default FuelMonitoring;
