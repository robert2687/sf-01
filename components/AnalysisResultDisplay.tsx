
import React, { useMemo } from 'react';
import { StructuralAnalysisResult, CfdAnalysisResult } from '../types';
import { Button } from './common/Button';
import { DownloadIcon } from './icons';

function handleDownload(content: string, fileName: string, mimeType: string) {
    if (content.startsWith('data:image')) { // Handle base64 image URLs
        const a = document.createElement('a');
        a.href = content;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else { // Handle plain text like CSV or reports
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export function AnalysisResultDisplay({ result }: { result: StructuralAnalysisResult | CfdAnalysisResult }): React.ReactElement {
    const tableData = useMemo(() => {
        let rows = result.data.split('\n').filter(Boolean);
        let header = rows[0].split(',');
        let body = rows.slice(1).map(row => row.split(','));
        return { header, body };
    }, [result.data]);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold text-light mb-2">Analysis Plot</h4>
                <div className="bg-primary p-2 rounded-md">
                   <img src={result.imageUrl} alt="Analysis plot" className="w-full h-auto object-contain rounded" />
                   <Button onClick={() => handleDownload(result.imageUrl, 'analysis-plot.png', 'image/png')} variant="secondary" className="w-full mt-2 text-xs">
                        <DownloadIcon className="w-4 h-4 mr-2"/> Download Image
                   </Button>
                </div>
            </div>
             <div>
                <h4 className="text-lg font-semibold text-light mb-2">Analysis Report</h4>
                <div className="bg-primary p-4 rounded-md whitespace-pre-wrap text-sm text-muted max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: result.report.replace(/(\r\n|\n|\r)/gm, "<br>") }}></div>
                 <Button onClick={() => handleDownload(result.report, 'analysis-report.md', 'text/markdown;charset=utf-8;')} variant="secondary" className="w-full mt-2 text-xs">
                        <DownloadIcon className="w-4 h-4 mr-2"/> Download Report
                   </Button>
            </div>
            <div>
                <h4 className="text-lg font-semibold text-light mb-2">Data Table</h4>
                 <div className="bg-primary p-2 rounded-md">
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-muted border-b border-gray-600 sticky top-0 bg-primary">
                                <tr>
                                    {tableData.header.map((h, i) => <th key={i} className="py-2 px-3 font-semibold">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.body.map((row, i) => (
                                    <tr key={i} className="border-t border-gray-700">
                                        {row.map((cell, j) => <td key={j} className="py-2 px-3">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={() => handleDownload(result.data, 'analysis-data.csv', 'text/csv;charset=utf-8;')} variant="secondary" className="w-full mt-2 text-xs">
                        <DownloadIcon className="w-4 h-4 mr-2"/> Download CSV
                   </Button>
                </div>
            </div>
        </div>
    );
};
