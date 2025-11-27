import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { detectAnomalies } from "@/lib/anomalyDetection";

interface SubmissionData {
  id: string;
  date: string;
  user_id: string;
  source: string[];
  calls_dialled: number;
  calls_taken: number;
  rapport_built: number;
  touched_base: number;
  calls_not_taken: number;
  others: number;
  disqualified: number;
  sm_rp: number;
  sm_enrolled: number;
  sm_rp_to_enrolled: number;
  fu_rp: number;
  fu_enrolled: number;
  fu_rp_to_enrolled: number;
}

interface ExportMenuProps {
  data: SubmissionData[];
  getUserName: (userId: string) => string;
}

export const ExportMenu = ({ data, getUserName }: ExportMenuProps) => {
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return "0.00";
    return ((value / total) * 100).toFixed(2);
  };

  const exportToCSV = () => {
    const headers = [
      "Date", "Employee", "Source",
      "Calls Dialled", "Calls Taken", "Rapport Built", "Touched Base",
      "Calls Not Taken", "Others", "Disqualified",
      "% Show-up", "% No Show-up",
      "SM: RP", "SM: Enrolled", "SM: RP to Enrolled", "SM: % Closing",
      "FU: RP", "FU: Enrolled", "FU: RP to Enrolled", "FU: % Closing",
      "Has Anomalies", "Critical Count", "Warning Count", "Info Count", "Success Count",
      "Critical Issues", "Warnings"
    ];

    const rows = data.map(s => {
      const anomalies = detectAnomalies({
        calls_dialled: s.calls_dialled,
        calls_taken: s.calls_taken,
        rapport_built: s.rapport_built,
        touched_base: s.touched_base,
        calls_not_taken: s.calls_not_taken,
        others: s.others,
        disqualified: s.disqualified,
        sm_rp: s.sm_rp,
        sm_enrolled: s.sm_enrolled,
        fu_rp: s.fu_rp,
        fu_enrolled: s.fu_enrolled,
      });

      return [
        s.date,
        getUserName(s.user_id),
        s.source.join(" | "),
        s.calls_dialled,
        s.calls_taken,
        s.rapport_built,
        s.touched_base,
        s.calls_not_taken,
        s.others,
        s.disqualified,
        calculatePercentage(s.calls_taken, s.calls_dialled),
        calculatePercentage(s.calls_not_taken, s.calls_dialled),
        s.sm_rp,
        s.sm_enrolled,
        s.sm_rp_to_enrolled,
        calculatePercentage(s.sm_rp + s.sm_enrolled, s.calls_taken),
        s.fu_rp,
        s.fu_enrolled,
        s.fu_rp_to_enrolled,
        calculatePercentage(s.fu_rp + s.fu_enrolled, s.calls_taken),
        anomalies.hasAnomalies ? "Yes" : "No",
        anomalies.critical.length,
        anomalies.warnings.length,
        anomalies.info.length,
        anomalies.success.length,
        anomalies.critical.map(a => a.message).join("; "),
        anomalies.warnings.map(a => a.message).join("; ")
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "CSV Exported",
      description: `${data.length} records exported successfully`,
    });
  };

  const exportToExcel = () => {
    const headers = [
      "Date", "Employee", "Source",
      "Calls Dialled", "Calls Taken", "Rapport Built", "Touched Base",
      "Calls Not Taken", "Others", "Disqualified",
      "% Show-up", "% No Show-up",
      "SM: RP", "SM: Enrolled", "SM: RP to Enrolled", "SM: % Closing",
      "FU: RP", "FU: Enrolled", "FU: RP to Enrolled", "FU: % Closing"
    ];

    const rows = data.map(s => [
      s.date,
      getUserName(s.user_id),
      s.source.join(" | "),
      s.calls_dialled,
      s.calls_taken,
      s.rapport_built,
      s.touched_base,
      s.calls_not_taken,
      s.others,
      s.disqualified,
      Number(calculatePercentage(s.calls_taken, s.calls_dialled)),
      Number(calculatePercentage(s.calls_not_taken, s.calls_dialled)),
      s.sm_rp,
      s.sm_enrolled,
      s.sm_rp_to_enrolled,
      Number(calculatePercentage(s.sm_rp + s.sm_enrolled, s.calls_taken)),
      s.fu_rp,
      s.fu_enrolled,
      s.fu_rp_to_enrolled,
      Number(calculatePercentage(s.fu_rp + s.fu_enrolled, s.calls_taken))
    ]);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Detailed Data Sheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 15 }));
    
    XLSX.utils.book_append_sheet(wb, ws, "Detailed Data");

    // Summary Sheet
    const totalCalls = data.reduce((sum, s) => sum + s.calls_dialled, 0);
    const totalTaken = data.reduce((sum, s) => sum + s.calls_taken, 0);
    const avgShowUp = totalCalls > 0 ? ((totalTaken / totalCalls) * 100).toFixed(2) : "0";
    
    const summaryData = [
      ["Summary Statistics", ""],
      ["", ""],
      ["Total Records", data.length],
      ["Total Calls Dialled", totalCalls],
      ["Total Calls Taken", totalTaken],
      ["Average Show-up %", avgShowUp + "%"],
      ["", ""],
      ["Date Range", ""],
      ["From", data.length > 0 ? data[data.length - 1].date : "N/A"],
      ["To", data.length > 0 ? data[0].date : "N/A"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Write file
    XLSX.writeFile(wb, `sales-data-${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Excel Exported",
      description: `${data.length} records exported with summary`,
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

    // Title
    doc.setFontSize(18);
    doc.text('Sales Performance Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Records: ${data.length}`, 14, 34);

    // Table data
    const headers = [
      ["Date", "Employee", "Source", "Dialled", "Taken", "RP Built", 
       "Touched", "Not Taken", "Others", "Disq.", "Show-up %", 
       "SM RP", "SM Enr.", "SM %", "FU RP", "FU Enr.", "FU %"]
    ];

    const rows = data.map(s => [
      new Date(s.date).toLocaleDateString(),
      getUserName(s.user_id).split(' ')[0], // First name only for space
      s.source.join(", ").substring(0, 15), // Truncated for space
      s.calls_dialled,
      s.calls_taken,
      s.rapport_built,
      s.touched_base,
      s.calls_not_taken,
      s.others,
      s.disqualified,
      calculatePercentage(s.calls_taken, s.calls_dialled) + '%',
      s.sm_rp,
      s.sm_enrolled,
      calculatePercentage(s.sm_rp + s.sm_enrolled, s.calls_taken) + '%',
      s.fu_rp,
      s.fu_enrolled,
      calculatePercentage(s.fu_rp + s.fu_enrolled, s.calls_taken) + '%'
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 40,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 40, right: 10, bottom: 20, left: 10 },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
    });

    doc.save(`sales-data-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "PDF Exported",
      description: `${data.length} records exported to PDF`,
    });
  };

  const exportAnomalyReport = () => {
    // Filter to only include submissions with anomalies
    const anomalyData = data.filter(s => {
      const anomalies = detectAnomalies({
        calls_dialled: s.calls_dialled,
        calls_taken: s.calls_taken,
        rapport_built: s.rapport_built,
        touched_base: s.touched_base,
        calls_not_taken: s.calls_not_taken,
        others: s.others,
        disqualified: s.disqualified,
        sm_rp: s.sm_rp,
        sm_enrolled: s.sm_enrolled,
        fu_rp: s.fu_rp,
        fu_enrolled: s.fu_enrolled,
      });
      return anomalies.hasAnomalies;
    });

    if (anomalyData.length === 0) {
      toast({
        title: "No Anomalies Found",
        description: "All data is clean - no anomalies to export!",
        variant: "default"
      });
      return;
    }

    const headers = [
      "Date", "Employee", "Source",
      "Severity", "Anomaly Type", "Field", "Description",
      "Calls Dialled", "Calls Taken", "Show-up %"
    ];

    const rows: any[] = [];
    anomalyData.forEach(s => {
      const anomalies = detectAnomalies({
        calls_dialled: s.calls_dialled,
        calls_taken: s.calls_taken,
        rapport_built: s.rapport_built,
        touched_base: s.touched_base,
        calls_not_taken: s.calls_not_taken,
        others: s.others,
        disqualified: s.disqualified,
        sm_rp: s.sm_rp,
        sm_enrolled: s.sm_enrolled,
        fu_rp: s.fu_rp,
        fu_enrolled: s.fu_enrolled,
      });

      // Add one row per anomaly
      [...anomalies.critical, ...anomalies.warnings, ...anomalies.info, ...anomalies.success].forEach(anomaly => {
        rows.push([
          s.date,
          getUserName(s.user_id),
          s.source.join(" | "),
          anomaly.type.toUpperCase(),
          anomaly.type === 'critical' ? 'CRITICAL' : 
           anomaly.type === 'warning' ? 'WARNING' : 
           anomaly.type === 'success' ? 'SUCCESS' : 'INFO',
          anomaly.field || 'general',
          anomaly.message,
          s.calls_dialled,
          s.calls_taken,
          calculatePercentage(s.calls_taken, s.calls_dialled) + '%'
        ]);
      });
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anomaly-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "Anomaly Report Exported",
      description: `${rows.length} anomalies from ${anomalyData.length} submissions`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportAnomalyReport}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Export Anomaly Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};