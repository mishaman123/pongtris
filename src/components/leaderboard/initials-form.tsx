'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface InitialsFormProps {
  open: boolean;
  score: number;
  onSubmit: (initials: string) => void;
  onCancel: () => void;
}

export default function InitialsForm({
  open,
  score,
  onSubmit,
  onCancel
}: InitialsFormProps) {
  const [initials, setInitials] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when the dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have valid initials (at least 1 character)
    if (initials.trim().length > 0) {
      onSubmit(initials.trim().toUpperCase().substring(0, 3));
    }
  };
  
  // Format the initials as they're typed (uppercase, max 3 chars)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Filter non-alphanumeric characters and convert to uppercase
    const value = e.target.value
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .substring(0, 3);
    setInitials(value);
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">New High Score!</DialogTitle>
          <DialogDescription>
            You scored {score.toLocaleString()} points. Enter your initials for the leaderboard.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="initials">Your Initials (3 characters max)</Label>
            <Input
              ref={inputRef}
              id="initials"
              placeholder="AAA"
              value={initials}
              onChange={handleChange}
              className="text-center text-2xl font-bold tracking-widest uppercase h-14"
              maxLength={3}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={initials.trim().length === 0}>Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 