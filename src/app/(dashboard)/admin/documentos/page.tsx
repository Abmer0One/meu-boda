'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { DocumentRepository } from '@/repositories/document.repository';
import { Document } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { supabase } from '@/lib/supabase';
import { validateFileForUpload } from '@/utils/uploadSecurity';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  FileCode,
  FileImage,
  ExternalLink,
  Plus,
} from 'lucide-react';

export default function DocumentosPage() {
  const { currentEvent } = useEvent();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modals and loading state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const extractStoragePath = (fileUrl: string): string => {
    if (!fileUrl) return '';
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      let clean = fileUrl.replace(/^\/+/, '');
      if (clean.startsWith('documents/')) {
        clean = clean.substring('documents/'.length);
      }
      return clean;
    }
    try {
      const url = new URL(fileUrl);
      const match = url.pathname.match(/\/documents\/(.+)$/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      const parts = url.pathname.split('/documents/');
      if (parts.length > 1) {
        return decodeURIComponent(parts.slice(1).join('/documents/'));
      }
    } catch {
      const parts = fileUrl.split('/documents/');
      if (parts.length > 1) {
        return decodeURIComponent(parts.slice(1).join('/documents/').split('?')[0]);
      }
    }
    return fileUrl;
  };

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const fetchedDocs = await DocumentRepository.getAll(currentEvent.id);
      setDocuments(fetchedDocs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      if (!docTitle) {
        // Auto-fill title from filename
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        setDocTitle(nameWithoutExt);
      }
    }
  };

  const handleOpenDoc = async (doc: Document, isDownload: boolean = false) => {
    if (isDownload) {
      setDownloadingDocId(doc.id);
    } else {
      setOpeningDocId(doc.id);
    }

    try {
      const storagePath = extractStoragePath(doc.file_url);
      if (!storagePath) {
        throw new Error('Caminho do documento inválido.');
      }

      const fileName = `${doc.title || 'documento'}.${(doc.file_type || 'pdf').toLowerCase()}`;

      // 1. Tentar gerar Signed URL segura (expira em 1 hora)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600, isDownload ? { download: fileName } : undefined);

      if (!signedError && signedData?.signedUrl) {
        if (isDownload) {
          const a = document.createElement('a');
          a.href = signedData.signedUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      // 2. Fallback para download direto via cliente Supabase
      const { data: blobData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (downloadError || !blobData) {
        throw downloadError || new Error('Não foi possível transferir o documento.');
      }

      const blobUrl = URL.createObjectURL(blobData);
      if (isDownload) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      }
    } catch (err: any) {
      console.error('Error opening/downloading document:', err);
      alert('Não foi possível abrir o documento. Verifique se o ficheiro ainda se encontra no servidor ou se tem permissões.');
    } finally {
      if (isDownload) {
        setDownloadingDocId(null);
      } else {
        setOpeningDocId(null);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !fileToUpload || !docTitle) return;

    const validation = validateFileForUpload(fileToUpload, {
      maxSizeMB: 15,
      allowedExtensions: ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'xlsx', 'xls'],
    });

    if (!validation.valid || !validation.sanitizedName) {
      alert(validation.error || 'Ficheiro inválido.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = fileToUpload.name.split('.').pop() || '';
      const filePath = `${currentEvent.id}/${Date.now()}_${validation.sanitizedName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Create document entry storing the storage path
      await DocumentRepository.create({
        event_id: currentEvent.id,
        title: docTitle.trim(),
        file_url: data.path,
        file_type: fileExt.toUpperCase(),
      });

      setUploadModalOpen(false);
      setDocTitle('');
      setFileToUpload(null);
      loadData();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      alert('Erro ao carregar documento: ' + (err.message || 'Falha no upload'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Tem a certeza que deseja eliminar o documento "${doc.title}"?`)) return;
    try {
      const storagePath = extractStoragePath(doc.file_url);
      if (storagePath) {
        try {
          await supabase.storage.from('documents').remove([storagePath]);
        } catch (e) {
          console.warn('Erro ao remover ficheiro do storage:', e);
        }
      }
      await DocumentRepository.delete(doc.id);
      loadData();
    } catch (err) {
      console.error('Erro ao eliminar documento:', err);
      alert('Erro ao eliminar documento.');
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif'].includes(type)) return <FileImage className="h-8 w-8 text-accent" />;
    if (['pdf'].includes(type)) return <FileText className="h-8 w-8 text-primary" />;
    return <FileCode className="h-8 w-8 text-foreground/45" />;
  };

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir documentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Arquivo de Documentos
          </h1>
          <p className="text-sm text-foreground/60">
            Armazene contratos de fornecedores, orçamentos, faturas e comprovativos de pagamento de forma segura.
          </p>
        </div>

        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setUploadModalOpen(true)} size="sm">
          Carregar Ficheiro
        </Button>
      </div>

      {/* Grid of docs */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card key={doc.id} className="bg-card-bg border border-border-custom flex items-center gap-4 p-4" hoverEffect>
              <div className="p-2 bg-secondary/50 rounded-xl shrink-0">
                {getFileIcon(doc.file_type)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate" title={doc.title}>
                  {doc.title}
                </h3>
                <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">{doc.file_type}</span>
              </div>

              <div className="flex items-center gap-1 border-l border-border-custom pl-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 rounded-full hover:bg-secondary text-foreground/70"
                  onClick={() => handleOpenDoc(doc, false)}
                  disabled={openingDocId === doc.id || downloadingDocId === doc.id}
                  title="Visualizar Ficheiro"
                >
                  {openingDocId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 rounded-full hover:bg-secondary text-foreground/70"
                  onClick={() => handleOpenDoc(doc, true)}
                  disabled={openingDocId === doc.id || downloadingDocId === doc.id}
                  title="Descarregar Ficheiro"
                >
                  {downloadingDocId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <button
                  onClick={() => handleDeleteDoc(doc)}
                  className="p-1.5 rounded-full text-foreground/45 hover:bg-error/15 hover:text-error transition-colors cursor-pointer"
                  title="Eliminar Ficheiro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <FileText className="h-10 w-10 text-foreground/25 mb-2" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum documento guardado</p>
          <p className="text-xs text-foreground/50 mt-1">
            Faça upload de contratos ou faturas clicando no botão &quot;Carregar Ficheiro&quot; acima.
          </p>
        </div>
      )}

      {/* UPLOAD DOCUMENT DIALOG */}
      <Dialog isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Carregar Novo Documento">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-border-custom rounded-xl p-6 flex flex-col items-center justify-center text-center bg-secondary/15 relative overflow-hidden min-h-[160px]">
            {fileToUpload ? (
              <div className="space-y-2">
                <FileText className="h-8 w-8 text-primary mx-auto" />
                <p className="text-xs font-semibold truncate max-w-[260px]">{fileToUpload.name}</p>
                <p className="text-[10px] text-foreground/50">{(fileToUpload.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-foreground/30 mb-2" />
                <p className="text-xs font-semibold">Arraste ou selecione o ficheiro</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">Suporta PDF, Imagens (máx. 10MB)</p>
              </>
            )}
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required={!fileToUpload}
            />
          </div>

          <Input
            label="Nome do Ficheiro / Descrição"
            placeholder="Contrato do Salão"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={uploading}>
              Carregar Ficheiro
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
