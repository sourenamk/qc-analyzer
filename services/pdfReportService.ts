


import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { CumulativeDataPoint, CalculatedStats, TestData } from '../components/types';

const saveAs = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
};

export const exportToPdf = async (reportElementId: string, testName: string) => {
    const input = document.getElementById(reportElementId);
    if (!input) {
        console.error(`Element with id ${reportElementId} not found.`);
        alert("Could not generate PDF. Report content not found.");
        return;
    }

    // Give a bit of time for rendering, and set a specific background for capture
    await new Promise(resolve => setTimeout(resolve, 100));
    const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#111827' // bg-gray-900
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with dimensions matching the captured canvas
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    const fileName = `QC_Report_${testName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};


export const exportToExcel = async (
    chartElementId: string,
    activeTest: TestData,
    data: CumulativeDataPoint[],
    stats: CalculatedStats
) => {
    if (!activeTest || !data || !stats) {
        alert("Cannot export to Excel, required data is missing.");
        return;
    }

    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
        alert("Cannot export to Excel, chart element not found.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Comprehensive Lab QC Analyzer';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`${activeTest.name} QC Data`);

    // --- Add Stats ---
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = `QC Analysis Summary for: ${activeTest.name}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    const statsData = [
        { label: 'Cumulative Bias (%)', value: stats.biasPercent?.toFixed(2) ?? 'N/A' },
        { label: 'Cumulative CV (%)', value: stats.observedCV?.toFixed(2) ?? 'N/A' },
        { label: 'Total Data Points', value: stats.count },
        { label: 'Target Mean', value: activeTest.targetMeanStr || 'N/A' }
    ];
    
    let statsRow = 3;
    statsData.forEach(stat => {
        sheet.getCell(`A${statsRow}`).value = stat.label;
        sheet.getCell(`B${statsRow}`).value = stat.value;
        sheet.getCell(`A${statsRow}`).font = { bold: true };
        statsRow++;
    });
    
    // --- Add Raw Data ---
    const dataStartRow = statsRow + 1;
    sheet.getCell(`A${dataStartRow}`).value = 'Date';
    sheet.getCell(`B${dataStartRow}`).value = 'Value';
    sheet.getCell(`A${dataStartRow}`).font = { bold: true };
    sheet.getCell(`B${dataStartRow}`).font = { bold: true };

    data.forEach((point, index) => {
        const row = sheet.getRow(dataStartRow + 1 + index);
        row.getCell(1).value = point.date.toISOString().split('T')[0];
        row.getCell(2).value = point.value;
    });

    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 15;

    // --- Add Chart Image ---
    try {
        const canvas = await html2canvas(chartElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#1f2937' // bg-gray-800
        });

        const imageBase64 = canvas.toDataURL('image/png');
        const imageId = workbook.addImage({
            base64: imageBase64,
            extension: 'png',
        });

        // Place image next to the data
        sheet.addImage(imageId, {
            tl: { col: 3.5, row: 2 },
            ext: { width: 500, height: 280 }
        });
    } catch (e) {
        console.error("Failed to add chart to excel", e);
        sheet.getCell('D3').value = "Chart could not be rendered in this export.";
        sheet.getCell('D3').font = { color: { argb: 'FFFF0000' } };
    }

    // --- Generate File ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `QC_Data_${activeTest.name.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
};