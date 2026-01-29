import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import {
  IEventAttributes,
  IEventCreationAttributes,
  IEventBadge,
  IEventReviewer,
  IEventApplication,
} from '../../types';

/**
 * Helper function to validate URL format
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validator for reviewers array
 */
function validateReviewers(value: IEventReviewer[]): void {
  if (!Array.isArray(value)) {
    throw new Error('Reviewers must be an array.');
  }
  for (const reviewer of value) {
    if (typeof reviewer.name !== 'string' || reviewer.name.length > 255) {
      throw new Error('Reviewer name must be a string with max length 255.');
    }
    if (!isValidURL(reviewer.github_profile_link)) {
      throw new Error('Invalid GitHub profile link format.');
    }
  }
}

@Table({
  tableName: 'events',
  timestamps: true,
})
export class Event extends Model<IEventAttributes, IEventCreationAttributes> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
    allowNull: false,
  })
  declare date: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare event_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare event_URL: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  declare badge: IEventBadge;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    validate: {
      isValidReviewers(value: IEventReviewer[]): void {
        validateReviewers(value);
      },
    },
  })
  declare reviewers: IEventReviewer[];

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  declare application: IEventApplication;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
